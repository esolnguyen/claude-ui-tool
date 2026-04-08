import asyncio
import uuid
from typing import Any
from pathlib import Path

from fastapi import WebSocket

from .message_normalizer import normalize_sdk_message
from .claude_dir import resolve_claude_path
from .frontmatter import parse_frontmatter

# Store active query instances for interruption
active_queries: dict[str, Any] = {}


async def query_claude_chat(prompt: str, options: dict, websocket: WebSocket) -> None:
    """Query Claude SDK and stream responses via WebSocket."""
    captured_session_id: str | None = options.get("session_id")
    session_created_sent = False

    try:
        from claude_agent_sdk import query, ClaudeAgentOptions  # type: ignore

        working_dir = options.get("working_dir") or str(Path.cwd())
        model = options.get("model")
        session_id = options.get("session_id")
        agent_instructions = options.get("agent_instructions")

        sdk_options = ClaudeAgentOptions(
            cwd=working_dir,
            permission_mode="bypassPermissions",
            allowed_tools=["Read", "Write", "Edit", "Glob", "Grep", "Bash"],
            max_turns=10,
            include_partial_messages=True,
        )

        if agent_instructions:
            sdk_options.system_prompt = {
                "type": "preset",
                "preset": "claude_code",
                "append": agent_instructions,
            }
        else:
            sdk_options.system_prompt = {"type": "preset", "preset": "claude_code"}

        if session_id:
            sdk_options.resume = session_id

        if model:
            sdk_options.model = model

        query_instance = query(prompt=prompt, options=sdk_options)

        async for message in query_instance:
            # Capture session ID
            msg_session_id = getattr(message, "session_id", None) or (
                message.get("session_id") if isinstance(message, dict) else None
            )
            if msg_session_id and not captured_session_id:
                captured_session_id = msg_session_id
                active_queries[captured_session_id] = query_instance

                if not session_id and not session_created_sent:
                    session_created_sent = True
                    await websocket.send_json({
                        "kind": "session_created",
                        "id": str(uuid.uuid4()),
                        "sessionId": captured_session_id,
                        "timestamp": _now(),
                        "content": captured_session_id,
                        "newSessionId": captured_session_id,
                    })

            normalized = normalize_sdk_message(message, captured_session_id or session_id or "unknown")
            for msg in normalized:
                await websocket.send_json(msg)

        await websocket.send_json({
            "kind": "complete",
            "id": str(uuid.uuid4()),
            "sessionId": captured_session_id or session_id or "unknown",
            "timestamp": _now(),
            "content": "",
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        await websocket.send_json({
            "kind": "error",
            "id": str(uuid.uuid4()),
            "sessionId": captured_session_id or options.get("session_id") or "unknown",
            "timestamp": _now(),
            "content": str(e),
        })
    finally:
        if captured_session_id and captured_session_id in active_queries:
            del active_queries[captured_session_id]


async def interrupt_query(session_id: str) -> bool:
    """Interrupt an active query."""
    instance = active_queries.get(session_id)
    if instance:
        try:
            if hasattr(instance, "interrupt"):
                await instance.interrupt()
            del active_queries[session_id]
            return True
        except Exception as e:
            print(f"[Claude SDK] Error interrupting query: {e}")
            return False
    return False


async def load_agent_instructions(agent_slug: str) -> str | None:
    """Load agent instructions from agent slug."""
    try:
        import aiofiles
        agent_path = resolve_claude_path("agents", f"{agent_slug}.md")
        async with aiofiles.open(agent_path, "r") as f:
            content = await f.read()
        _, body = parse_frontmatter(content)
        return body or None
    except Exception as e:
        print(f"[Claude SDK] Failed to load agent {agent_slug}: {e}")
        return None


def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
