"""Resolved paths for local data (SQLite, JSON stores)."""

from __future__ import annotations

import os

# Backend working directory is typically LLM/backend when running uvicorn
_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(_BACKEND_ROOT, "data")
SETTINGS_PATH = os.path.join(DATA_DIR, "settings.json")
MEMORY_DB_PATH = os.path.join(DATA_DIR, "memory.db")
# Saved UI chat threads (separate from assistant memory.db)
CHAT_SESSIONS_DB_PATH = os.path.join(DATA_DIR, "chat_sessions.db")


def ensure_data_dir() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
