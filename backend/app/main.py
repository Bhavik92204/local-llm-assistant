"""
Jarvis Local — FastAPI entrypoint.

Run from `backend/`:
  uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    chat_routes,
    chat_sessions_routes,
    health_routes,
    memory_routes,
    settings_routes,
    system_routes,
    tools_routes,
    voice_routes,
)
from app.config import get_settings
from app.logging_config import configure_logging
from app.paths import ensure_data_dir

configure_logging()
ensure_data_dir()

app = FastAPI(
    title="Jarvis Local API",
    description="Local assistant backend: Ollama, tools, memory, settings, system metrics.",
    version="0.2.0",
)

_settings = get_settings()
_LOCAL_DEV_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origin_list,
    allow_origin_regex=_LOCAL_DEV_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_PREFIX = "/api"
app.include_router(health_routes.router, prefix=_PREFIX)
app.include_router(chat_routes.router, prefix=_PREFIX)
app.include_router(chat_sessions_routes.router, prefix=_PREFIX)
app.include_router(tools_routes.router, prefix=_PREFIX)
app.include_router(memory_routes.router, prefix=_PREFIX)
app.include_router(settings_routes.router, prefix=_PREFIX)
app.include_router(system_routes.router, prefix=_PREFIX)
app.include_router(voice_routes.router, prefix=_PREFIX)
