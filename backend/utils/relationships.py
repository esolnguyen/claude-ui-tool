import re
from dataclasses import dataclass
from typing import Literal


RelationshipType = Literal["spawns", "agent-frontmatter", "spawned-by"]
EntityType = Literal["agent", "command", "skill", "plugin", "mcp"]


@dataclass
class Relationship:
    source_type: EntityType
    source_slug: str
    target_type: EntityType
    target_slug: str
    type: RelationshipType
    evidence: str

    def to_dict(self) -> dict:
        return {
            "sourceType": self.source_type,
            "sourceSlug": self.source_slug,
            "targetType": self.target_type,
            "targetSlug": self.target_slug,
            "type": self.type,
            "evidence": self.evidence,
        }


def extract_relationships(
    agents: list[dict],
    commands: list[dict],
    skills: list[dict] = [],
    plugins: list[dict] = [],
    mcp_servers: list[dict] = [],
    extra_skill_slugs: list[str] = [],
) -> list[Relationship]:
    """Extract relationships between agents, commands, skills, plugins, and MCP servers."""
    relationships: list[Relationship] = []
    seen: set[str] = set()

    agent_names = {a["slug"] for a in agents}
    skill_slugs = {s["slug"] for s in skills}
    for plugin in plugins:
        for skill in plugin.get("skills", []):
            skill_slugs.add(skill)
    for slug in extra_skill_slugs:
        skill_slugs.add(slug)
    mcp_names = {s["name"] for s in mcp_servers}

    def add(rel: Relationship) -> None:
        key = f"{rel.source_type}:{rel.source_slug}->{rel.target_type}:{rel.target_slug}"
        if key not in seen:
            seen.add(key)
            relationships.append(rel)

    # Agents: frontmatter.skills → skill relationships
    for agent in agents:
        fm = agent.get("frontmatter", {})
        preloaded = fm.get("skills", [])
        if isinstance(preloaded, list):
            for skill_slug in preloaded:
                if skill_slug in skill_slugs:
                    add(Relationship(
                        source_type="agent", source_slug=agent["slug"],
                        target_type="skill", target_slug=skill_slug,
                        type="agent-frontmatter",
                        evidence=f"preloads skill: {skill_slug}",
                    ))

    # Commands: frontmatter.agent, subagent_type patterns, spawn patterns, agent mentions
    for cmd in commands:
        fm = cmd.get("frontmatter", {})
        body = cmd.get("body", "")

        agent_ref = fm.get("agent")
        if agent_ref and agent_ref in agent_names:
            add(Relationship(
                source_type="command", source_slug=cmd["slug"],
                target_type="agent", target_slug=agent_ref,
                type="agent-frontmatter", evidence=f"agent: {agent_ref}",
            ))

        for m in re.finditer(r'subagent_type\s*[:=]\s*["\']?([a-z][\w-]*)["\']?', body, re.IGNORECASE):
            name = m.group(1)
            if name in agent_names:
                add(Relationship(
                    source_type="command", source_slug=cmd["slug"],
                    target_type="agent", target_slug=name,
                    type="spawns", evidence=m.group(0),
                ))

        for mcp_name in mcp_names:
            if re.search(f"mcp__{re.escape(mcp_name)}__", body, re.IGNORECASE):
                add(Relationship(
                    source_type="command", source_slug=cmd["slug"],
                    target_type="mcp", target_slug=mcp_name,
                    type="spawns", evidence=f'uses tools from "{mcp_name}" MCP server',
                ))

        for m in re.finditer(r'[Ss]pawn(?:s|ed)?\s+(?:the\s+)?["\']?([a-z][\w-]*)["\']?', body):
            name = m.group(1)
            if name in agent_names:
                add(Relationship(
                    source_type="command", source_slug=cmd["slug"],
                    target_type="agent", target_slug=name,
                    type="spawns", evidence=m.group(0),
                ))

        for agent_slug in agent_names:
            if len(agent_slug) < 4:
                continue
            pattern = r"\b" + re.escape(agent_slug).replace(r"\-", r"[\s\-]") + r"\b"
            if re.search(pattern, body, re.IGNORECASE):
                add(Relationship(
                    source_type="command", source_slug=cmd["slug"],
                    target_type="agent", target_slug=agent_slug,
                    type="spawns", evidence=f'mentions "{agent_slug}"',
                ))

    # Agents body: command references and MCP mentions
    for agent in agents:
        body = agent.get("body", "")
        for m in re.finditer(r"/(\w+[:\-]\w[\w-]*)", body):
            cmd_name = m.group(1)
            matching = next(
                (c for c in commands if c.get("frontmatter", {}).get("name") == cmd_name
                 or c["slug"] == cmd_name.replace(":", "--")),
                None,
            )
            if matching:
                add(Relationship(
                    source_type="agent", source_slug=agent["slug"],
                    target_type="command", target_slug=matching["slug"],
                    type="spawned-by", evidence=m.group(0),
                ))

        for mcp_name in mcp_names:
            if re.search(f"mcp__{re.escape(mcp_name)}__", body, re.IGNORECASE):
                add(Relationship(
                    source_type="agent", source_slug=agent["slug"],
                    target_type="mcp", target_slug=mcp_name,
                    type="spawns", evidence=f'uses tools from "{mcp_name}" MCP server',
                ))

    # Skills: frontmatter.agent, body agent mentions, MCP mentions
    for skill in skills:
        fm = skill.get("frontmatter", {})
        body = skill.get("body", "")

        agent_ref = fm.get("agent")
        if agent_ref and agent_ref in agent_names:
            add(Relationship(
                source_type="skill", source_slug=skill["slug"],
                target_type="agent", target_slug=agent_ref,
                type="agent-frontmatter", evidence=f"agent: {agent_ref}",
            ))

        for agent_slug in agent_names:
            if len(agent_slug) < 4:
                continue
            pattern = r"\b" + re.escape(agent_slug).replace(r"\-", r"[\s\-]") + r"\b"
            if re.search(pattern, body, re.IGNORECASE):
                add(Relationship(
                    source_type="skill", source_slug=skill["slug"],
                    target_type="agent", target_slug=agent_slug,
                    type="spawns", evidence=f'mentions "{agent_slug}"',
                ))

        for mcp_name in mcp_names:
            if re.search(f"mcp__{re.escape(mcp_name)}__", body, re.IGNORECASE):
                add(Relationship(
                    source_type="skill", source_slug=skill["slug"],
                    target_type="mcp", target_slug=mcp_name,
                    type="spawns", evidence=f'uses tools from "{mcp_name}" MCP server',
                ))

    # Plugins: link plugin → its skills
    for plugin in plugins:
        for skill_name in plugin.get("skills", []):
            if skill_name in skill_slugs:
                add(Relationship(
                    source_type="plugin", source_slug=plugin["id"],
                    target_type="skill", target_slug=skill_name,
                    type="spawns", evidence=f'provides skill "{skill_name}"',
                ))

    return relationships
