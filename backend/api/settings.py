from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from ..utils.claude_dir import resolve_claude_path
from ..utils.file_utils import read_json, write_json

router = APIRouter(prefix="/api/settings", tags=["settings"])

_SETTINGS_PATH = lambda: Path(resolve_claude_path("settings.json"))


@router.get("")
async def get_settings() -> dict[str, Any]:
    try:
        return await read_json(_SETTINGS_PATH())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read settings: {e}")


@router.put("")
async def update_settings(settings: dict[str, Any]) -> dict[str, Any]:
    try:
        await write_json(_SETTINGS_PATH(), settings)
        return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write settings: {e}")
