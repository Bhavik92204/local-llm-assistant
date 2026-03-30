"""Aggregated health for /api/health/full."""

from __future__ import annotations

from app.config import get_settings
from app.ollama_client import model_is_available, ollama_list_models, ollama_ping
from app.services.memory_service import get_memory_service
from app.services.settings_service import get_effective_config


async def build_full_health() -> dict:
    s = get_settings()
    eff = get_effective_config(s)
    o_ok = await ollama_ping(eff.ollama_base_url)
    models = await ollama_list_models(eff.ollama_base_url) if o_ok else []
    m_avail = model_is_available(models, eff.ollama_model)
    mem = get_memory_service()
    return {
        "backend_ok": True,
        "ollama_reachable": o_ok,
        "ollama_model": eff.ollama_model,
        "model_available": m_avail,
        "tools_enabled": eff.tools_enabled,
        "memory_enabled": eff.memory_enabled,
        "voice_enabled": eff.voice_enabled,
        "memory_entry_count": mem.count(),
    }
