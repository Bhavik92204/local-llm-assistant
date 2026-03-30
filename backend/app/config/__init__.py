"""Application configuration: env-backed settings and assistant personality presets."""

from app.config.env import Settings, get_settings

__all__ = ["Settings", "get_settings"]
