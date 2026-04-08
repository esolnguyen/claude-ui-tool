import asyncio
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..utils.claude_dir import get_claude_dir

router = APIRouter()

# In-memory session store
sessions: dict[str, dict] = {}


async def _read_pty_output(pty_process, session_id: str, websocket: WebSocket) -> None:
    """Read PTY output and stream to WebSocket."""
    loop = asyncio.get_event_loop()
    try:
        while True:
            # Read in thread executor to avoid blocking
            try:
                data = await loop.run_in_executor(None, _read_pty, pty_process)
                if data:
                    await websocket.send_json({"type": "output", "data": data})
                else:
                    await asyncio.sleep(0.01)
            except EOFError:
                break
            except Exception:
                break
    finally:
        exit_code = 0
        try:
            if pty_process.isalive():
                pty_process.close()
            exit_code = pty_process.exitstatus or 0
        except Exception:
            pass
        sessions.pop(session_id, None)
        try:
            await websocket.send_json({"type": "exit", "exitCode": exit_code})
        except Exception:
            pass


def _read_pty(pty_process) -> str:
    """Blocking PTY read — runs in executor."""
    try:
        import ptyprocess
        data = pty_process.read(4096)
        if isinstance(data, bytes):
            return data.decode("utf-8", errors="replace")
        return data
    except EOFError:
        raise
    except Exception:
        return ""


@router.websocket("/ws/cli")
async def cli_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    session_id: str | None = None
    read_task: asyncio.Task | None = None

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "execute":
                session_id = str(uuid.uuid4())
                working_dir = data.get("workingDir", os.getcwd())
                cols = data.get("cols", 220)
                rows = data.get("rows", 50)
                agent_slug = data.get("agentSlug")

                # Build command
                cmd = ["claude"]
                if agent_slug:
                    cmd.extend(["--agent", agent_slug])

                try:
                    import ptyprocess
                    pty = ptyprocess.PtyProcess.spawn(
                        cmd,
                        cwd=working_dir,
                        dimensions=(rows, cols),
                        env={**os.environ, "TERM": "xterm-256color"},
                    )
                    sessions[session_id] = {"pty": pty, "working_dir": working_dir}

                    await websocket.send_json({"type": "session", "sessionId": session_id})

                    read_task = asyncio.create_task(
                        _read_pty_output(pty, session_id, websocket)
                    )
                except Exception as e:
                    await websocket.send_json({"type": "error", "error": str(e)})

            elif msg_type == "input":
                sid = data.get("sessionId", session_id)
                session = sessions.get(sid)
                if session:
                    input_data = data.get("data", "")
                    try:
                        session["pty"].write(input_data.encode("utf-8"))
                    except Exception as e:
                        await websocket.send_json({"type": "error", "error": str(e)})

            elif msg_type == "resize":
                sid = data.get("sessionId", session_id)
                session = sessions.get(sid)
                if session:
                    cols = data.get("cols", 220)
                    rows = data.get("rows", 50)
                    try:
                        session["pty"].setwinsize(rows, cols)
                    except Exception:
                        pass

            elif msg_type == "kill":
                sid = data.get("sessionId", session_id)
                session = sessions.pop(sid, None)
                if session:
                    try:
                        session["pty"].close()
                    except Exception:
                        pass
                if read_task and not read_task.done():
                    read_task.cancel()

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[CLI WS] Error: {e}")
    finally:
        if read_task and not read_task.done():
            read_task.cancel()
        if session_id and session_id in sessions:
            session = sessions.pop(session_id)
            try:
                session["pty"].close()
            except Exception:
                pass
