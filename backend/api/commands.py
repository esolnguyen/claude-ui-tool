from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..utils.claude_dir import resolve_claude_path
from ..utils.frontmatter import parse_frontmatter, serialize_frontmatter
from ..utils.slug_utils import to_slug

router = APIRouter(prefix="/api/commands", tags=["commands"])


class CommandFrontmatterModel(BaseModel):
    name: str
    description: str
    argument_hint: Optional[str] = Field(None, alias="argument-hint")
    allowed_tools: Optional[list[str]] = Field(None, alias="allowed-tools")
    agent: Optional[str] = None

    model_config = {"populate_by_name": True}


class CommandPayload(BaseModel):
    frontmatter: CommandFrontmatterModel
    body: str
    directory: Optional[str] = None


def _slug_from_path(file_path: Path, commands_dir: Path) -> str:
    rel = file_path.relative_to(commands_dir)
    parts = list(rel.parts)
    parts[-1] = parts[-1].replace(".md", "")
    return "--".join(parts)


def _build_command_dict(slug: str, file_path: Path, rel_dir: str, frontmatter: dict, body: str) -> dict:
    return {
        "slug": slug,
        "filename": file_path.name,
        "directory": rel_dir,
        "frontmatter": {"name": slug, **frontmatter},
        "body": body,
        "filePath": str(file_path),
    }


@router.get("")
async def list_commands() -> list[dict]:
    commands_dir = Path(resolve_claude_path("commands"))
    commands_dir.mkdir(parents=True, exist_ok=True)
    commands = []
    for file_path in sorted(commands_dir.rglob("*.md")):
        try:
            async with aiofiles.open(file_path, "r") as f:
                content = await f.read()
            frontmatter, body = parse_frontmatter(content)
            slug = _slug_from_path(file_path, commands_dir)
            rel = file_path.relative_to(commands_dir)
            rel_dir = "/".join(rel.parts[:-1]) if len(rel.parts) > 1 else ""
            commands.append(_build_command_dict(slug, file_path, rel_dir, frontmatter, body))
        except Exception as e:
            print(f"Error reading command {file_path}: {e}")
    return commands


@router.get("/{slug:path}")
async def get_command(slug: str) -> dict:
    commands_dir = Path(resolve_claude_path("commands"))
    # Try direct slug → filename mapping
    parts = slug.split("--")
    file_path = commands_dir.joinpath(*parts[:-1], f"{parts[-1]}.md")
    if not file_path.exists():
        # Search all .md files
        found = next((p for p in commands_dir.rglob("*.md")
                      if _slug_from_path(p, commands_dir) == slug), None)
        if not found:
            raise HTTPException(status_code=404, detail=f"Command '{slug}' not found")
        file_path = found

    async with aiofiles.open(file_path, "r") as f:
        content = await f.read()
    frontmatter, body = parse_frontmatter(content)
    rel = file_path.relative_to(commands_dir)
    rel_dir = "/".join(rel.parts[:-1]) if len(rel.parts) > 1 else ""
    return _build_command_dict(slug, file_path, rel_dir, frontmatter, body)


@router.post("")
async def create_command(payload: CommandPayload) -> dict:
    commands_dir = Path(resolve_claude_path("commands"))
    subdir = payload.directory or ""
    target_dir = commands_dir / subdir if subdir else commands_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    slug = to_slug(payload.frontmatter.name)
    file_path = target_dir / f"{slug}.md"
    if file_path.exists():
        raise HTTPException(status_code=409, detail=f"Command '{slug}' already exists")

    fm = payload.frontmatter.model_dump(by_alias=True, exclude_none=True)
    content = serialize_frontmatter(fm, payload.body)
    async with aiofiles.open(file_path, "w") as f:
        await f.write(content)

    full_slug = _slug_from_path(file_path, commands_dir)
    return _build_command_dict(full_slug, file_path, subdir, fm, payload.body)


@router.put("/{slug:path}")
async def update_command(slug: str, payload: CommandPayload) -> dict:
    commands_dir = Path(resolve_claude_path("commands"))
    parts = slug.split("--")
    file_path = commands_dir.joinpath(*parts[:-1], f"{parts[-1]}.md")
    if not file_path.exists():
        found = next((p for p in commands_dir.rglob("*.md")
                      if _slug_from_path(p, commands_dir) == slug), None)
        if not found:
            raise HTTPException(status_code=404, detail=f"Command '{slug}' not found")
        file_path = found

    fm = payload.frontmatter.model_dump(by_alias=True, exclude_none=True)
    content = serialize_frontmatter(fm, payload.body)
    async with aiofiles.open(file_path, "w") as f:
        await f.write(content)
    rel = file_path.relative_to(commands_dir)
    rel_dir = "/".join(rel.parts[:-1]) if len(rel.parts) > 1 else ""
    return _build_command_dict(slug, file_path, rel_dir, fm, payload.body)


@router.delete("/{slug:path}")
async def delete_command(slug: str) -> dict:
    commands_dir = Path(resolve_claude_path("commands"))
    parts = slug.split("--")
    file_path = commands_dir.joinpath(*parts[:-1], f"{parts[-1]}.md")
    if not file_path.exists():
        found = next((p for p in commands_dir.rglob("*.md")
                      if _slug_from_path(p, commands_dir) == slug), None)
        if not found:
            raise HTTPException(status_code=404, detail=f"Command '{slug}' not found")
        file_path = found
    file_path.unlink()
    return {"success": True, "slug": slug}
