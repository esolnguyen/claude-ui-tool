import re
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..utils.claude_dir import resolve_claude_path
from ..utils.file_utils import read_json, read_frontmatter_file, write_frontmatter_file
from ..utils.frontmatter import parse_frontmatter
from ..utils.slug_utils import to_slug

router = APIRouter(prefix="/api/skills", tags=["skills"])


class SkillFrontmatterModel(BaseModel):
    name: str
    description: str
    context: Optional[str] = None
    agent: Optional[str] = None


class SkillPayload(BaseModel):
    frontmatter: SkillFrontmatterModel
    body: str


def _normalize_slug(dir_name: str, frontmatter: dict) -> str:
    slug = dir_name
    if (slug.lower() == "skill" or not slug) and frontmatter.get("name"):
        slug = re.sub(r"[^a-z0-9]+", "-", frontmatter["name"].lower()).strip("-")
    return slug


def _build(slug: str, file_path: Path, fm: dict, body: str, source: str = "local", **extra) -> dict:
    return {"slug": slug, "frontmatter": {"name": slug, **fm}, "body": body,
            "filePath": str(file_path), "source": source, **extra}


# ── GitHub import scanner ────────────────────────────────────────────────────

async def _scan_github_imports() -> list[dict]:
    """Scan all GitHub-imported repos and return skill dicts."""
    registry_path = Path(resolve_claude_path(".imports.json"))
    if not registry_path.exists():
        return []

    skills: list[dict] = []
    try:
        data = await read_json(registry_path)
        for entry in data.get("imports", []):
            local_path = Path(entry.get("localPath", ""))
            target_path = entry.get("targetPath", "")
            scan_root = local_path / target_path if target_path else local_path
            if not scan_root.exists():
                continue
            selected = set(entry.get("selectedItems", []))
            owner = entry.get("owner", "")
            repo = entry.get("repo", "")
            github_repo = f"{owner}/{repo}" if owner and repo else ""

            for md_file in sorted(scan_root.rglob("*.md")):
                try:
                    fm, body = await read_frontmatter_file(md_file)
                    if not fm.get("name") or not fm.get("description"):
                        continue
                    parent = md_file.parent.name
                    slug = parent if md_file.name.lower() == "skill.md" else md_file.stem
                    slug = _normalize_slug(slug, fm)
                    if not slug:
                        continue
                    if selected and slug not in selected:
                        continue
                    skills.append(_build(slug, md_file, fm, body,
                                         source="github", githubRepo=github_repo))
                except Exception:
                    pass
    except Exception as e:
        print(f"Error scanning GitHub imports: {e}")
    return skills


async def _find_github_skill(slug: str) -> Optional[dict]:
    """Find a single skill by slug across all GitHub imports."""
    for skill in await _scan_github_imports():
        if skill["slug"] == slug:
            return skill
    return None


# ── Agent preloads helper ────────────────────────────────────────────────────

async def _load_agent_preloads() -> dict[str, list[dict]]:
    preloads: dict[str, list[dict]] = {}
    agents_dir = Path(resolve_claude_path("agents"))
    if not agents_dir.exists():
        return preloads
    for file_path in agents_dir.glob("*.md"):
        try:
            fm, _ = await read_frontmatter_file(file_path)
            agent_slug = file_path.stem
            agent_name = fm.get("name", agent_slug)
            for skill_slug in (fm.get("skills") or []):
                preloads.setdefault(skill_slug, []).append({"name": agent_name, "slug": agent_slug})
        except Exception:
            pass
    return preloads


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("")
async def list_skills() -> list[dict]:
    agent_preloads = await _load_agent_preloads()
    skills: list[dict] = []
    seen: set[str] = set()

    # 1. Local skills
    skills_dir = Path(resolve_claude_path("skills"))
    skills_dir.mkdir(parents=True, exist_ok=True)
    for skill_dir in sorted(skills_dir.iterdir()):
        if not skill_dir.is_dir():
            continue
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            continue
        try:
            fm, body = await read_frontmatter_file(skill_file)
            slug = _normalize_slug(skill_dir.name, fm)
            skill = _build(slug, skill_file, fm, body, source="local")
            skill["agents"] = agent_preloads.get(slug, [])
            skills.append(skill)
            seen.add(slug)
        except Exception as e:
            print(f"Error reading skill {skill_dir}: {e}")

    # 2. Plugin skills
    installed_path = Path(resolve_claude_path("plugins", "installed_plugins.json"))
    if installed_path.exists():
        try:
            installed = await read_json(installed_path)
            plugins_map = installed.get("plugins", {}) if isinstance(installed, dict) else {}
            for plugin_id, entries in plugins_map.items():
                entry = entries[0] if entries else None
                if not entry:
                    continue
                install_path = Path(entry.get("installPath", ""))
                if not install_path.is_absolute():
                    install_path = Path(resolve_claude_path("plugins", str(install_path)))
                plugin_skills_dir = install_path / "skills"
                if not plugin_skills_dir.exists():
                    continue
                plugin_name = plugin_id.split("@")[0]
                for skill_dir in sorted(plugin_skills_dir.iterdir()):
                    if not skill_dir.is_dir():
                        continue
                    skill_file = skill_dir / "SKILL.md"
                    if not skill_file.exists():
                        continue
                    try:
                        fm, body = await read_frontmatter_file(skill_file)
                        slug = _normalize_slug(skill_dir.name, fm)
                        if slug in seen:
                            continue
                        skill = _build(slug, skill_file, fm, body,
                                       source="plugin", pluginName=plugin_name)
                        skill["agents"] = agent_preloads.get(slug, [])
                        skills.append(skill)
                        seen.add(slug)
                    except Exception as e:
                        print(f"Error reading plugin skill {skill_dir}: {e}")
        except Exception as e:
            print(f"Error reading installed plugins: {e}")

    # 3. GitHub imported skills
    for skill in await _scan_github_imports():
        if skill["slug"] not in seen:
            skill["agents"] = agent_preloads.get(skill["slug"], [])
            skills.append(skill)
            seen.add(skill["slug"])

    return sorted(skills, key=lambda s: s["slug"])


@router.get("/{slug}")
async def get_skill(slug: str) -> dict:
    # Local first
    skill_file = Path(resolve_claude_path("skills", slug, "SKILL.md"))
    if skill_file.exists():
        fm, body = await read_frontmatter_file(skill_file)
        return _build(slug, skill_file, fm, body, source="local")

    # GitHub imports
    skill = await _find_github_skill(slug)
    if skill:
        return skill

    raise HTTPException(status_code=404, detail=f"Skill '{slug}' not found")


@router.post("")
async def create_skill(payload: SkillPayload) -> dict:
    slug = to_slug(payload.frontmatter.name)
    skill_dir = Path(resolve_claude_path("skills", slug))
    if skill_dir.exists():
        raise HTTPException(status_code=409, detail=f"Skill '{slug}' already exists")
    skill_file = skill_dir / "SKILL.md"
    fm = payload.frontmatter.model_dump(exclude_none=True)
    await write_frontmatter_file(skill_file, fm, payload.body)
    return _build(slug, skill_file, fm, payload.body, source="local")


@router.put("/{slug}")
async def update_skill(slug: str, payload: SkillPayload) -> dict:
    skill_file = Path(resolve_claude_path("skills", slug, "SKILL.md"))
    if not skill_file.exists():
        raise HTTPException(status_code=404, detail=f"Skill '{slug}' not found")
    fm = payload.frontmatter.model_dump(exclude_none=True)
    await write_frontmatter_file(skill_file, fm, payload.body)
    return _build(slug, skill_file, fm, payload.body, source="local")


@router.delete("/{slug}")
async def delete_skill(slug: str) -> dict:
    skill_dir = Path(resolve_claude_path("skills", slug))
    if not skill_dir.exists():
        raise HTTPException(status_code=404, detail=f"Skill '{slug}' not found")
    shutil.rmtree(skill_dir)
    return {"success": True, "slug": slug}
