import json
from pathlib import Path

import aiofiles
from fastapi import APIRouter

from ..utils.claude_dir import resolve_claude_path
from ..utils.frontmatter import parse_frontmatter
from ..utils.relationships import extract_relationships
from ..utils.agent_utils import encode_agent_slug

router = APIRouter(prefix="/api/relationships", tags=["relationships"])


async def _load_agents(agents_dir: Path) -> list[dict]:
    """Load agents recursively with proper slug encoding for nested dirs."""
    items = []
    if not agents_dir.exists():
        return items
    for file_path in sorted(agents_dir.rglob("*.md")):
        try:
            async with aiofiles.open(file_path, "r") as f:
                content = await f.read()
            frontmatter, body = parse_frontmatter(content)
            rel = file_path.relative_to(agents_dir)
            parts = list(rel.parts)
            name = parts[-1].replace(".md", "")
            rel_dir = "/".join(parts[:-1]) if len(parts) > 1 else ""
            slug = encode_agent_slug(rel_dir, name)
            items.append({"slug": slug, "frontmatter": frontmatter, "body": body})
        except Exception:
            pass
    return items


async def _load_commands(commands_dir: Path) -> list[dict]:
    """Load commands with slug derived from relative path."""
    items = []
    if not commands_dir.exists():
        return items
    for file_path in sorted(commands_dir.rglob("*.md")):
        try:
            async with aiofiles.open(file_path, "r") as f:
                content = await f.read()
            frontmatter, body = parse_frontmatter(content)
            rel = file_path.relative_to(commands_dir)
            parts = list(rel.parts)
            parts[-1] = parts[-1].replace(".md", "")
            slug = "--".join(parts)
            items.append({"slug": slug, "frontmatter": frontmatter, "body": body})
        except Exception:
            pass
    return items


@router.get("")
async def get_relationships() -> dict:
    agents_dir = Path(resolve_claude_path("agents"))
    commands_dir = Path(resolve_claude_path("commands"))
    skills_dir = Path(resolve_claude_path("skills"))

    agents_dir.mkdir(parents=True, exist_ok=True)
    commands_dir.mkdir(parents=True, exist_ok=True)
    skills_dir.mkdir(parents=True, exist_ok=True)

    agents = await _load_agents(agents_dir)
    commands = await _load_commands(commands_dir)

    # Load skills (each in its own dir as SKILL.md)
    skills = []
    for skill_dir in sorted(skills_dir.iterdir()):
        skill_file = skill_dir / "SKILL.md"
        if skill_file.exists():
            try:
                async with aiofiles.open(skill_file, "r") as f:
                    content = await f.read()
                frontmatter, body = parse_frontmatter(content)
                skills.append({"slug": skill_dir.name, "frontmatter": frontmatter, "body": body})
            except Exception:
                pass

    # Load plugins
    plugins = []
    plugins_file = Path(resolve_claude_path("plugins.json"))
    if plugins_file.exists():
        async with aiofiles.open(plugins_file, "r") as f:
            plugins_data = json.loads(await f.read())
        plugins = plugins_data if isinstance(plugins_data, list) else []

    # Load MCP servers from claude_desktop_config.json or settings
    mcp_servers = []
    for config_name in ["claude_desktop_config.json", "settings.json"]:
        config_path = Path(resolve_claude_path(config_name))
        if config_path.exists():
            try:
                async with aiofiles.open(config_path, "r") as f:
                    config = json.loads(await f.read())
                mcp_raw = config.get("mcpServers", {})
                if isinstance(mcp_raw, dict):
                    mcp_servers = [{"name": name} for name in mcp_raw.keys()]
                break
            except Exception:
                pass

    relationships = extract_relationships(agents, commands, skills, plugins, mcp_servers)
    return {"relationships": [r.to_dict() for r in relationships]}
