import re
import yaml
from typing import Any


def parse_frontmatter(raw: str) -> tuple[dict[str, Any], str]:
    """Parse YAML frontmatter from a markdown string.
    Returns (frontmatter_dict, body_string).
    """
    match = re.match(r"^---\n([\s\S]*?)\n---\n?([\s\S]*)$", raw)
    if not match:
        return {}, raw

    yaml_block = match.group(1)
    body_block = match.group(2)

    try:
        frontmatter = yaml.safe_load(yaml_block) or {}
        body = body_block.lstrip("\n")
        return frontmatter, body
    except yaml.YAMLError:
        # Fallback: manual key-value parsing
        fm: dict[str, Any] = {}
        for line in yaml_block.split("\n"):
            kv = re.match(r"^(\S+):\s*(.*)$", line)
            if kv:
                key = kv.group(1)
                value: Any = kv.group(2).strip()
                if isinstance(value, str) and value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                fm[key] = value
        body = body_block.lstrip("\n")
        return fm, body


def serialize_frontmatter(frontmatter: dict[str, Any], body: str) -> str:
    """Serialize frontmatter dict + body into a markdown string with YAML front matter."""
    yaml_str = yaml.dump(
        frontmatter,
        default_flow_style=False,
        allow_unicode=True,
        sort_keys=False,
    ).rstrip()
    return f"---\n{yaml_str}\n---\n\n{body}"
