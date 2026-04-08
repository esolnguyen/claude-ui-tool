"""
Server-side model registry.
Mirrors server/utils/models.ts from the original Node.js project.
"""
from dataclasses import dataclass
from typing import Optional

MODEL_IDS = ["claude-opus-4", "claude-sonnet-4", "claude-haiku-4"]

# Map from short alias (used in agent frontmatter) to full API model id
MODEL_ALIAS: dict[str, str] = {
    "opus": "claude-opus-4",
    "sonnet": "claude-sonnet-4",
    "haiku": "claude-haiku-4",
}

# Named constants for alias keys
class MODEL_ALIAS_KEY:
    OPUS = "opus"
    SONNET = "sonnet"
    HAIKU = "haiku"

DEFAULT_MODEL_ALIAS = MODEL_ALIAS_KEY.SONNET


@dataclass
class ModelPricing:
    input: float   # USD per 1M input tokens
    output: float  # USD per 1M output tokens
    cached: float  # USD per 1M cache-read tokens


@dataclass
class ServerModelMeta:
    id: str
    context_window: int
    pricing: ModelPricing


SERVER_MODEL_META: dict[str, ServerModelMeta] = {
    "claude-opus-4": ServerModelMeta(
        id="claude-opus-4",
        context_window=200_000,
        pricing=ModelPricing(input=15.0, output=75.0, cached=1.5),
    ),
    "claude-sonnet-4": ServerModelMeta(
        id="claude-sonnet-4",
        context_window=200_000,
        pricing=ModelPricing(input=3.0, output=15.0, cached=0.3),
    ),
    "claude-haiku-4": ServerModelMeta(
        id="claude-haiku-4",
        context_window=200_000,
        pricing=ModelPricing(input=0.8, output=4.0, cached=0.08),
    ),
}

DEFAULT_PRICING = SERVER_MODEL_META["claude-sonnet-4"].pricing
DEFAULT_CONTEXT_WINDOW = 200_000


def resolve_model_meta(model: Optional[str]) -> Optional[ServerModelMeta]:
    if not model:
        return None
    if model in SERVER_MODEL_META:
        return SERVER_MODEL_META[model]
    aliased = MODEL_ALIAS.get(model)
    if aliased:
        return SERVER_MODEL_META.get(aliased)
    return None


def get_model_pricing(model: Optional[str]) -> ModelPricing:
    meta = resolve_model_meta(model)
    return meta.pricing if meta else DEFAULT_PRICING


def get_model_context_window(model: Optional[str]) -> int:
    meta = resolve_model_meta(model)
    return meta.context_window if meta else DEFAULT_CONTEXT_WINDOW
