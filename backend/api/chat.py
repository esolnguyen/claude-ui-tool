import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..utils.claude_sdk import query_claude_chat, interrupt_query, load_agent_instructions

router = APIRouter()


@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    active_task: asyncio.Task | None = None

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "start":
                # Cancel any in-flight query
                if active_task and not active_task.done():
                    active_task.cancel()

                prompt = data.get("message", "")
                session_id = data.get("sessionId")
                agent_slug = data.get("agentSlug")
                working_dir = data.get("workingDir")
                model = data.get("model")

                # Load agent instructions if agent slug provided
                agent_instructions: str | None = None
                if agent_slug:
                    agent_instructions = await load_agent_instructions(agent_slug)

                options = {
                    "session_id": session_id,
                    "agent_instructions": agent_instructions,
                    "working_dir": working_dir,
                    "model": model,
                }

                active_task = asyncio.create_task(
                    query_claude_chat(prompt, options, websocket)
                )

            elif msg_type == "abort":
                session_id = data.get("sessionId", "")
                if active_task and not active_task.done():
                    active_task.cancel()
                if session_id:
                    await interrupt_query(session_id)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[Chat WS] Error: {e}")
    finally:
        if active_task and not active_task.done():
            active_task.cancel()
