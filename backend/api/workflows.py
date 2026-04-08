from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..utils.claude_dir import resolve_claude_path
from ..utils.file_utils import read_json, write_json
from ..utils.slug_utils import to_slug

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


class WorkflowStep(BaseModel):
    id: str
    agentSlug: str
    label: str


class WorkflowPayload(BaseModel):
    name: str
    description: str
    steps: list[WorkflowStep]


def _build(slug: str, file_path: Path, data: dict) -> dict:
    return {
        "slug": slug,
        "name": data.get("name", ""),
        "description": data.get("description", ""),
        "steps": data.get("steps", []),
        "createdAt": data.get("createdAt", ""),
        "lastRunAt": data.get("lastRunAt"),
        "filePath": str(file_path),
    }


@router.get("")
async def list_workflows() -> list[dict]:
    workflows_dir = Path(resolve_claude_path("workflows"))
    workflows_dir.mkdir(parents=True, exist_ok=True)
    result = []
    for file_path in sorted(workflows_dir.glob("*.json")):
        try:
            data = await read_json(file_path)
            result.append(_build(file_path.stem, file_path, data))
        except Exception as e:
            print(f"Error reading workflow {file_path}: {e}")
    return result


@router.get("/{slug}")
async def get_workflow(slug: str) -> dict:
    file_path = Path(resolve_claude_path("workflows", f"{slug}.json"))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Workflow '{slug}' not found")
    return _build(slug, file_path, await read_json(file_path))


@router.post("")
async def create_workflow(payload: WorkflowPayload) -> dict:
    slug = to_slug(payload.name)
    file_path = Path(resolve_claude_path("workflows", f"{slug}.json"))
    if file_path.exists():
        raise HTTPException(status_code=409, detail=f"Workflow '{slug}' already exists")
    data = {
        "name": payload.name,
        "description": payload.description,
        "steps": [s.model_dump() for s in payload.steps],
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await write_json(file_path, data)
    return _build(slug, file_path, data)


@router.put("/{slug}")
async def update_workflow(slug: str, payload: WorkflowPayload) -> dict:
    file_path = Path(resolve_claude_path("workflows", f"{slug}.json"))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Workflow '{slug}' not found")
    existing = await read_json(file_path)
    data = {**existing, "name": payload.name, "description": payload.description,
            "steps": [s.model_dump() for s in payload.steps]}
    await write_json(file_path, data)
    return _build(slug, file_path, data)


@router.delete("/{slug}")
async def delete_workflow(slug: str) -> dict:
    file_path = Path(resolve_claude_path("workflows", f"{slug}.json"))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Workflow '{slug}' not found")
    file_path.unlink()
    return {"success": True, "slug": slug}
