from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import HealthFullResponse, StatusResponse
from app.ollama_client import model_is_available, ollama_list_models, ollama_ping
from app.services.health_service import build_full_health
from app.services.settings_service import get_effective_config
from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/full", response_model=HealthFullResponse)
async def health_full() -> HealthFullResponse:
    data = await build_full_health()
    return HealthFullResponse(**data)


@router.get("/status", response_model=StatusResponse)
async def status() -> StatusResponse:
    s = get_settings()
    eff = get_effective_config(s)
    o_ok = await ollama_ping(eff.ollama_base_url)
    models = await ollama_list_models(eff.ollama_base_url) if o_ok else []
    m_avail = model_is_available(models, eff.ollama_model)
    return StatusResponse(
        ollama_reachable=o_ok,
        configured_model=eff.ollama_model,
        models_installed=models,
        model_available=m_avail,
    )
