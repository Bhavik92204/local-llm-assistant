"""
Loads and merges environment defaults with persisted `data/settings.json`.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass

from app.config import Settings, get_settings
from app.config.personality import DEFAULT_PRESET_KEY, PRESETS, list_preset_keys
from app.logging_config import get_logger
from app.models.schemas import AppSettingsFile
from app.paths import SETTINGS_PATH, ensure_data_dir

log = get_logger("jarvis.settings")


@dataclass
class EffectiveConfig:
    """Resolved configuration for a single request or operation."""

    ollama_base_url: str
    ollama_model: str
    cors_origins: str
    max_tool_rounds: int
    memory_enabled: bool
    tools_enabled: bool
    voice_enabled: bool
    system_metrics_interval_sec: int
    allowed_applications: list[str]
    assistant_personality: str


def _default_file() -> AppSettingsFile:
    return AppSettingsFile()


def load_settings_file() -> AppSettingsFile:
    ensure_data_dir()
    if not os.path.isfile(SETTINGS_PATH):
        return _default_file()
    try:
        with open(SETTINGS_PATH, encoding="utf-8") as f:
            raw = json.load(f)
        return AppSettingsFile.model_validate(raw)
    except (json.JSONDecodeError, OSError, ValueError):
        return _default_file()


def save_settings_file(data: AppSettingsFile) -> None:
    ensure_data_dir()
    with open(SETTINGS_PATH, "w", encoding="utf-8") as f:
        f.write(data.model_dump_json(indent=2))


def merge_update(current: AppSettingsFile, patch: dict) -> AppSettingsFile:
    d = current.model_dump()
    for k, v in patch.items():
        if v is not None:
            d[k] = v
    return AppSettingsFile.model_validate(d)


def _resolved_personality_preset(f: AppSettingsFile, env: Settings) -> str:
    raw_file = (f.personality_preset or "").strip()
    if raw_file:
        if raw_file in PRESETS:
            return raw_file
        log.warning(
            "Ignoring unknown personality_preset in settings file: %r",
            raw_file,
        )
    raw_env = (env.assistant_personality or "").strip()
    if raw_env:
        if raw_env in PRESETS:
            return raw_env
        log.warning("Ignoring unknown ASSISTANT_PERSONALITY env value: %r", raw_env)
    return DEFAULT_PRESET_KEY


def get_effective_config(env: Settings | None = None) -> EffectiveConfig:
    env = env or get_settings()
    f = load_settings_file()
    base_url = (f.ollama_base_url or "").strip() or env.ollama_base_url
    model = (f.ollama_model or "").strip() or env.ollama_model
    preset = _resolved_personality_preset(f, env)
    return EffectiveConfig(
        ollama_base_url=base_url.rstrip("/"),
        ollama_model=model,
        cors_origins=env.cors_origins,
        max_tool_rounds=env.max_tool_rounds,
        memory_enabled=f.memory_enabled,
        tools_enabled=f.tools_enabled,
        voice_enabled=f.voice_enabled,
        system_metrics_interval_sec=f.system_metrics_interval_sec,
        allowed_applications=list(f.allowed_applications),
        assistant_personality=preset,
    )


def settings_response_payload(env: Settings | None = None) -> tuple[dict, AppSettingsFile, dict, list[str]]:
    env = env or get_settings()
    f = load_settings_file()
    eff = get_effective_config(env)
    effective_dict = {
        "ollama_base_url": eff.ollama_base_url,
        "ollama_model": eff.ollama_model,
        "memory_enabled": eff.memory_enabled,
        "tools_enabled": eff.tools_enabled,
        "voice_enabled": eff.voice_enabled,
        "system_metrics_interval_sec": eff.system_metrics_interval_sec,
        "allowed_applications": eff.allowed_applications,
        "assistant_personality": eff.assistant_personality,
    }
    env_fallback = {
        "ollama_base_url": env.ollama_base_url,
        "ollama_model": env.ollama_model,
        "assistant_personality": env.assistant_personality,
    }
    return effective_dict, f, env_fallback, list_preset_keys()
