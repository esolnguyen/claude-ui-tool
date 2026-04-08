"""Async helpers for file I/O used across API routers."""
import json
from pathlib import Path

import aiofiles

from .frontmatter import parse_frontmatter, serialize_frontmatter


async def read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    async with aiofiles.open(path, "r") as f:
        return json.loads(await f.read())


async def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(path, "w") as f:
        await f.write(json.dumps(data, indent=2))


async def read_frontmatter_file(path: Path) -> tuple[dict, str]:
    async with aiofiles.open(path, "r") as f:
        content = await f.read()
    return parse_frontmatter(content)


async def write_frontmatter_file(path: Path, fm: dict, body: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(path, "w") as f:
        await f.write(serialize_frontmatter(fm, body))
