from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    OllamaTestResponse,
    SettingsResponse,
    SettingsUpdateRequest,
)
from app.ollama_client import ollama_list_models, ollama_ping
from app.services.settings_service import (
    get_effective_config,
    load_settings_file,
    merge_update,
    save_settings_file,
    settings_response_payload,
)

router = APIRouter(tags=["settings"])


@router.get("/settings", response_model=SettingsResponse)
async def get_settings_api() -> SettingsResponse:
    eff, f, env_fb, preset_keys = settings_response_payload()
    return SettingsResponse(
        effective=eff,
        file=f,
        env_fallback=env_fb,
        personality_preset_keys=preset_keys,
    )


@router.put("/settings", response_model=SettingsResponse)
async def put_settings(body: SettingsUpdateRequest) -> SettingsResponse:
    current = load_settings_file()
    patch = body.model_dump(exclude_unset=True)
    try:
        updated = merge_update(current, patch)
        save_settings_file(updated)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(e)) from e
    eff, f, env_fb, preset_keys = settings_response_payload()
    return SettingsResponse(
        effective=eff,
        file=f,
        env_fallback=env_fb,
        personality_preset_keys=preset_keys,
    )


@router.post("/settings/test-ollama", response_model=OllamaTestResponse)
async def test_ollama() -> OllamaTestResponse:
    eff = get_effective_config()
    ok = await ollama_ping(eff.ollama_base_url, timeout=8.0)
    if not ok:
        return OllamaTestResponse(
            ok=False,
            message="Could not reach Ollama at the configured base URL.",
            models=[],
        )
    models = await ollama_list_models(eff.ollama_base_url)
    return OllamaTestResponse(
        ok=True,
        message="Connected to Ollama.",
        models=models,
    )
