import re
import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..utils.claude_dir import resolve_claude_path
from ..utils.file_utils import read_json, write_json

router = APIRouter(prefix="/api/github", tags=["github"])

_IMPORTS_PATH = lambda: Path(resolve_claude_path(".imports.json"))


def _parse_github_url(url: str) -> tuple[str, str]:
    url = url.strip().rstrip("/").removesuffix(".git")
    match = re.search(r"github\.com[/:]([^/]+)/([^/]+)$", url)
    if match:
        return match.group(1), match.group(2)
    parts = url.split("/")
    if len(parts) == 2 and all(parts):
        return parts[0], parts[1]
    raise ValueError(f"Cannot parse GitHub URL: {url}")


class ImportRequest(BaseModel):
    url: str


@router.post("/import")
async def import_github_repo(payload: ImportRequest) -> dict:
    try:
        owner, repo = _parse_github_url(payload.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    clone_dir = Path(resolve_claude_path("github", owner, repo))

    if clone_dir.exists():
        try:
            import git
            git.Repo(clone_dir).remotes.origin.pull()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to pull repo: {e}")
    else:
        clone_dir.parent.mkdir(parents=True, exist_ok=True)
        try:
            import git
            git.Repo.clone_from(f"https://github.com/{owner}/{repo}.git", clone_dir)
        except Exception as e:
            if clone_dir.exists():
                shutil.rmtree(clone_dir)
            raise HTTPException(status_code=500, detail=f"Failed to clone repo: {e}")

    data = await read_json(_IMPORTS_PATH())
    data.setdefault("imports", [])
    already_registered = any(
        e.get("owner") == owner and e.get("repo") == repo
        for e in data["imports"]
    )
    if not already_registered:
        data["imports"].append({
            "localPath": str(clone_dir),
            "targetPath": "",
            "selectedItems": [],
            "owner": owner,
            "repo": repo,
        })
        await write_json(_IMPORTS_PATH(), data)

    return {"success": True, "owner": owner, "repo": repo, "localPath": str(clone_dir)}


@router.delete("/import/{owner}/{repo}")
async def remove_github_import(owner: str, repo: str) -> dict:
    data = await read_json(_IMPORTS_PATH())
    imports = data.get("imports", [])
    new_imports = [
        e for e in imports
        if not (e.get("owner") == owner and e.get("repo") == repo)
    ]
    if len(new_imports) == len(imports):
        raise HTTPException(status_code=404, detail=f"{owner}/{repo} not found in imports")
    data["imports"] = new_imports
    await write_json(_IMPORTS_PATH(), data)

    clone_dir = Path(resolve_claude_path("github", owner, repo))
    if clone_dir.exists():
        shutil.rmtree(clone_dir)

    return {"success": True, "owner": owner, "repo": repo}


@router.get("/imports")
async def list_imports() -> list[dict]:
    data = await read_json(_IMPORTS_PATH())
    return data.get("imports", [])
