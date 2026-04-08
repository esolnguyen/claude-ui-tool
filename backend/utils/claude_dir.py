import os
from pathlib import Path

_current_claude_dir: str | None = None


def get_claude_dir() -> str:
    global _current_claude_dir
    if not _current_claude_dir:
        env_dir = os.environ.get("CLAUDE_DIR")
        _current_claude_dir = env_dir or str(Path.home() / ".claude")
    return _current_claude_dir


def set_claude_dir(directory: str) -> None:
    global _current_claude_dir
    if not Path(directory).exists():
        raise ValueError(f"Directory does not exist: {directory}")
    _current_claude_dir = directory


def resolve_claude_path(*segments: str) -> str:
    return str(Path(get_claude_dir()).joinpath(*segments))
