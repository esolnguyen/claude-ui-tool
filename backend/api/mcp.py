from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..utils.claude_dir import resolve_claude_path
from ..utils.file_utils import read_json, write_json

router = APIRouter(prefix="/api/mcp", tags=["mcp"])

_SETTINGS_PATH = lambda: Path(resolve_claude_path("settings.json"))


async def _read_mcp_servers() -> dict:
    settings = await read_json(_SETTINGS_PATH())
    return settings.get("mcpServers", {}), settings


async def _save_mcp_servers(mcp_servers: dict) -> None:
    settings = await read_json(_SETTINGS_PATH())
    settings["mcpServers"] = mcp_servers
    await write_json(_SETTINGS_PATH(), settings)


class McpServerPayload(BaseModel):
    name: str
    command: str
    args: Optional[list[str]] = None
    env: Optional[dict[str, str]] = None
    type: Optional[str] = None


@router.get("")
async def list_mcp_servers() -> list[dict]:
    mcp_servers, _ = await _read_mcp_servers()
    return [{"name": name, **config} for name, config in mcp_servers.items()]


@router.post("")
async def add_mcp_server(payload: McpServerPayload) -> dict:
    mcp_servers, _ = await _read_mcp_servers()
    if payload.name in mcp_servers:
        raise HTTPException(status_code=409, detail=f"MCP server '{payload.name}' already exists")

    config: dict[str, Any] = {"command": payload.command}
    if payload.args:
        config["args"] = payload.args
    if payload.env:
        config["env"] = payload.env
    if payload.type:
        config["type"] = payload.type

    mcp_servers[payload.name] = config
    await _save_mcp_servers(mcp_servers)
    return {"name": payload.name, **config}


@router.get("/{name}")
async def get_mcp_server(name: str) -> dict:
    mcp_servers, _ = await _read_mcp_servers()
    if name not in mcp_servers:
        raise HTTPException(status_code=404, detail=f"MCP server '{name}' not found")
    return {"name": name, **mcp_servers[name]}


@router.delete("/{name}")
async def delete_mcp_server(name: str) -> dict:
    mcp_servers, _ = await _read_mcp_servers()
    if name not in mcp_servers:
        raise HTTPException(status_code=404, detail=f"MCP server '{name}' not found")
    del mcp_servers[name]
    await _save_mcp_servers(mcp_servers)
    return {"success": True, "name": name}
