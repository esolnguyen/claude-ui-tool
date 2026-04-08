import re
import uuid
from datetime import datetime, timezone
from typing import Any


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get(obj: Any, key: str) -> Any:
    """Get attribute from object or dict."""
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


def _msg(kind: str, session_id: str, **kwargs: Any) -> dict:
    return {"kind": kind, "id": str(uuid.uuid4()), "sessionId": session_id, "timestamp": _now(), **kwargs}


def normalize_sdk_message(sdk_message: Any, session_id: str) -> list[dict]:
    """Normalize Claude SDK messages into our unified NormalizedMessage format."""
    messages: list[dict] = []
    msg_type = _get(sdk_message, "type")

    # Handle stream events
    if msg_type == "stream_event":
        evt = _get(sdk_message, "event")
        if not evt:
            return messages

        evt_type = _get(evt, "type")

        if evt_type == "content_block_delta":
            delta = _get(evt, "delta")
            if delta:
                delta_type = _get(delta, "type")
                if delta_type == "text_delta":
                    text = _get(delta, "text")
                    if text:
                        messages.append(_msg("stream_delta", session_id, role="assistant", content=text))
                elif delta_type == "thinking_delta":
                    thinking = _get(delta, "thinking")
                    if thinking:
                        messages.append(_msg("thinking", session_id, content=thinking))
                elif delta_type == "input_json_delta":
                    partial_json = _get(delta, "partial_json")
                    if partial_json:
                        messages.append(_msg("tool_input_delta", session_id, content=partial_json))

        elif evt_type == "content_block_start":
            block = _get(evt, "content_block")
            if block:
                block_type = _get(block, "type")
                if block_type == "thinking":
                    messages.append(_msg("thinking", session_id, content=""))
                elif block_type == "tool_use":
                    tool_name = _get(block, "name") or "tool"
                    tool_id = _get(block, "id")
                    messages.append(_msg("tool_use", session_id,
                                        toolName=tool_name, toolId=tool_id, toolInput={},
                                        metadata={"toolUseId": tool_id}))

        elif evt_type == "content_block_stop":
            messages.append(_msg("stream_end", session_id))

    # Handle system messages (local command output from slash commands)
    elif msg_type == "system":
        subtype = _get(sdk_message, "subtype")
        if subtype == "local_command_output":
            content = _get(sdk_message, "content") or ""
            msg_id = _get(sdk_message, "uuid") or str(uuid.uuid4())
            messages.append({
                "kind": "text", "id": msg_id, "sessionId": session_id,
                "timestamp": _now(), "role": "assistant", "content": content,
            })

    # Handle tool_progress
    elif msg_type == "tool_progress":
        tool_name = _get(sdk_message, "tool_name") or "tool"
        elapsed = _get(sdk_message, "elapsed_time_seconds")
        messages.append(_msg("tool_use", session_id, toolName=tool_name,
                             metadata={"elapsed": elapsed, "status": "running"}))

    # Handle tool_result
    elif msg_type == "tool_result":
        tool_id = _get(sdk_message, "tool_use_id")
        content = _get(sdk_message, "content") or ""
        is_error = _get(sdk_message, "is_error") or False
        messages.append(_msg("tool_result", session_id, toolId=tool_id, content=content, isError=is_error))

    # Handle result (final, with aggregated usage)
    elif msg_type == "result":
        total_input = 0
        total_output = 0
        total_cache_read = 0
        total_cache_creation = 0
        total_cost = _get(sdk_message, "total_cost_usd") or 0
        context_window = 200_000

        model_usage = _get(sdk_message, "modelUsage")
        if model_usage and isinstance(model_usage, dict):
            for mu in model_usage.values():
                if isinstance(mu, dict):
                    total_input += mu.get("inputTokens", 0)
                    total_output += mu.get("outputTokens", 0)
                    total_cache_read += mu.get("cacheReadInputTokens", 0)
                    total_cache_creation += mu.get("cacheCreationInputTokens", 0)
                    if mu.get("contextWindow"):
                        context_window = mu["contextWindow"]

        if total_input == 0:
            usage = _get(sdk_message, "usage")
            if usage:
                g = usage.get if isinstance(usage, dict) else lambda k, d=0: getattr(usage, k, d)
                total_input = g("input_tokens", 0)
                total_output = g("output_tokens", 0)
                total_cache_read = g("cache_read_input_tokens", 0)
                total_cache_creation = g("cache_creation_input_tokens", 0)

        stop_reason = _get(sdk_message, "stop_reason")
        messages.append(_msg("complete", session_id, content="", metadata={
            "stopReason": stop_reason,
            "modelUsage": model_usage,
            "aggregatedUsage": {
                "input": total_input, "output": total_output,
                "cacheRead": total_cache_read, "cacheCreation": total_cache_creation,
                "contextWindow": context_window, "totalCost": total_cost,
            },
        }))

    return messages


def is_internal_content(content: str) -> bool:
    if not content:
        return False
    patterns = [
        r"<system-reminder>", r"</system-reminder>",
        r"<claude_background_info>", r"</claude_background_info>",
    ]
    return any(re.search(p, content, re.IGNORECASE) for p in patterns)


def filter_internal_content(message: dict) -> dict:
    """Remove internal system content from a message dict."""
    content = message.get("content", "")
    if content and is_internal_content(content):
        cleaned = re.sub(r"<system-reminder>[\s\S]*?</system-reminder>", "", content, flags=re.IGNORECASE)
        return {**message, "content": cleaned}
    return message


def attach_tool_results(messages: list[dict]) -> list[dict]:
    """Merge tool_result messages into their corresponding tool_use messages."""
    result: list[dict] = []
    tool_use_map: dict[str, int] = {}  # toolUseId -> index in result

    for message in messages:
        if message.get("kind") == "tool_use":
            tool_use_id = (message.get("metadata") or {}).get("toolUseId") or message.get("id")
            idx = len(result)
            if tool_use_id:
                tool_use_map[tool_use_id] = idx
            result.append(message)
        elif message.get("kind") == "tool_result":
            tool_id = message.get("toolId")
            if tool_id and tool_id in tool_use_map:
                idx = tool_use_map[tool_id]
                existing = result[idx]
                result[idx] = {
                    **existing,
                    "toolResult": message.get("toolResult"),
                    "isError": message.get("isError"),
                    "metadata": {
                        **(existing.get("metadata") or {}),
                        "resultId": message.get("id"),
                        "resultTimestamp": message.get("timestamp"),
                    },
                }
            else:
                result.append(message)
        else:
            result.append(message)

    return result
