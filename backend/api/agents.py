import os
from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..utils.claude_dir import resolve_claude_path
from ..utils.frontmatter import parse_frontmatter, serialize_frontmatter
from ..utils.agent_utils import encode_agent_slug, decode_agent_slug, resolve_agent_file_path

router = APIRouter(prefix="/api/agents", tags=["agents"])


class AgentFrontmatterModel(BaseModel):
    name: str
    description: str
    model: Optional[str] = None
    color: Optional[str] = None
    memory: Optional[str] = None
    skills: Optional[list[str]] = None
    tools: Optional[list[str]] = None


class AgentPayload(BaseModel):
    frontmatter: AgentFrontmatterModel
    body: str
    directory: Optional[str] = None


def _build_agent_dict(slug: str, file_path: Path, directory: str, frontmatter: dict, body: str) -> dict:
    memory_dir = Path(resolve_claude_path("agent-memory", slug))
    has_memory = memory_dir.exists()
    return {
        "slug": slug,
        "filename": file_path.name,
        "directory": directory,
        "frontmatter": {"name": slug, **frontmatter},
        "body": body,
        "hasMemory": has_memory,
        "filePath": str(file_path),
    }


async def _scan_dir(directory: Path, rel_dir: str) -> list[dict]:
    """Recursively scan a directory for agent .md files."""
    if not directory.exists():
        return []
    agents = []
    for entry in sorted(directory.iterdir()):
        if entry.is_dir():
            sub_rel = f"{rel_dir}/{entry.name}" if rel_dir else entry.name
            agents.extend(await _scan_dir(entry, sub_rel))
        elif entry.suffix == ".md":
            try:
                async with aiofiles.open(entry, "r") as f:
                    content = await f.read()
                frontmatter, body = parse_frontmatter(content)
                name = entry.stem
                slug = encode_agent_slug(rel_dir, name)
                agents.append(_build_agent_dict(slug, entry, rel_dir, frontmatter, body))
            except Exception as e:
                print(f"Error reading agent {entry}: {e}")
    return agents


@router.get("")
async def list_agents() -> list[dict]:
    agents_dir = Path(resolve_claude_path("agents"))
    agents_dir.mkdir(parents=True, exist_ok=True)
    agents = await _scan_dir(agents_dir, "")
    return sorted(agents, key=lambda a: a["slug"])


@router.get("/{slug:path}")
async def get_agent(slug: str) -> dict:
    file_path = Path(resolve_agent_file_path(slug))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Agent '{slug}' not found")
    async with aiofiles.open(file_path, "r") as f:
        content = await f.read()
    frontmatter, body = parse_frontmatter(content)
    directory, name = decode_agent_slug(slug)
    return _build_agent_dict(slug, file_path, directory, frontmatter, body)


@router.post("")
async def create_agent(payload: AgentPayload) -> dict:
    directory = payload.directory or ""
    name = payload.frontmatter.name
    slug = encode_agent_slug(directory, name)
    file_path = Path(resolve_agent_file_path(slug))

    if file_path.exists():
        raise HTTPException(status_code=409, detail=f"Agent '{slug}' already exists")

    # Ensure target directory exists
    target_dir = (
        Path(resolve_claude_path("agents", *directory.split("/")))
        if directory
        else Path(resolve_claude_path("agents"))
    )
    target_dir.mkdir(parents=True, exist_ok=True)

    fm_dict = payload.frontmatter.model_dump(exclude_none=True)
    content = serialize_frontmatter(fm_dict, payload.body)

    async with aiofiles.open(file_path, "w") as f:
        await f.write(content)

    # Create memory directory if memory is enabled
    memory = payload.frontmatter.memory
    if memory and memory != "none":
        memory_dir = Path(resolve_claude_path("agent-memory", slug))
        memory_dir.mkdir(parents=True, exist_ok=True)

    has_memory = bool(memory and memory != "none")
    return {
        "slug": slug,
        "filename": f"{name}.md",
        "directory": directory,
        "frontmatter": {"name": slug, **fm_dict},
        "body": payload.body,
        "hasMemory": has_memory,
        "filePath": str(file_path),
    }


@router.put("/{slug:path}")
async def update_agent(slug: str, payload: AgentPayload) -> dict:
    file_path = Path(resolve_agent_file_path(slug))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Agent '{slug}' not found")

    fm_dict = payload.frontmatter.model_dump(exclude_none=True)
    content = serialize_frontmatter(fm_dict, payload.body)

    async with aiofiles.open(file_path, "w") as f:
        await f.write(content)

    directory, _ = decode_agent_slug(slug)
    return _build_agent_dict(slug, file_path, directory, fm_dict, payload.body)


@router.delete("/{slug:path}")
async def delete_agent(slug: str) -> dict:
    file_path = Path(resolve_agent_file_path(slug))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Agent '{slug}' not found")
    file_path.unlink()
    return {"success": True, "slug": slug}
