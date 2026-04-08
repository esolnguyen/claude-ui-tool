"""
Agent slug encoding/decoding utilities.
Mirrors server/utils/agentUtils.ts from the original Node.js project.

Slug convention:
  'code-reviewer'              → directory='',            name='code-reviewer'
  'engineering--code-reviewer' → directory='engineering', name='code-reviewer'

Rule: split on the LAST occurrence of '--'. Agent names and directory names
may contain single '-' but not '--'.
"""
from pathlib import Path
from .claude_dir import resolve_claude_path


def decode_agent_slug(slug: str) -> tuple[str, str]:
    """Return (directory, name) for a given agent slug."""
    idx = slug.rfind("--")
    if idx == -1:
        return "", slug
    directory = slug[:idx].replace("--", "/")
    name = slug[idx + 2:]
    return directory, name


def encode_agent_slug(directory: str, name: str) -> str:
    """Encode directory + name into an agent slug."""
    if not directory:
        return name
    return f"{directory.replace('/', '--')}--{name}"


def resolve_agent_file_path(slug: str) -> str:
    """Resolve the absolute file path for an agent given its slug."""
    directory, name = decode_agent_slug(slug)
    if directory:
        return resolve_claude_path("agents", *directory.split("/"), f"{name}.md")
    return resolve_claude_path("agents", f"{name}.md")
