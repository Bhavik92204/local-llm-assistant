"""API request/response models."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatMessageIn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=100_000)


class ChatRequest(BaseModel):
    messages: list[ChatMessageIn] = Field(..., min_length=1)


class ToolEventOut(BaseModel):
    tool: str
    ok: bool
    detail: str | None = None


class ChatResponse(BaseModel):
    message: str
    model: str
    tool_events: list[ToolEventOut] = Field(default_factory=list)
    memory_used: bool = False


class ToolExecuteRequest(BaseModel):
    name: str
    arguments: dict[str, Any] | None = None


class ToolExecuteResponse(BaseModel):
    result: str
    ok: bool = True


class ToolInfo(BaseModel):
    name: str
    description: str


class StatusResponse(BaseModel):
    ollama_reachable: bool
    configured_model: str
    models_installed: list[str]
    model_available: bool = False


class AppSettingsFile(BaseModel):
    """Persisted user settings (partial updates allowed)."""

    ollama_base_url: str = ""
    ollama_model: str = ""
    memory_enabled: bool = True
    voice_enabled: bool = False
    tools_enabled: bool = True
    system_metrics_interval_sec: int = Field(default=5, ge=2, le=120)
    allowed_applications: list[str] = Field(
        default_factory=lambda: ["notepad", "calculator"]
    )
    personality_preset: str = ""


class SettingsResponse(BaseModel):
    effective: dict[str, Any]
    file: AppSettingsFile
    env_fallback: dict[str, str]
    personality_preset_keys: list[str] = Field(default_factory=list)


class SettingsUpdateRequest(BaseModel):
    ollama_base_url: str | None = None
    ollama_model: str | None = None
    memory_enabled: bool | None = None
    voice_enabled: bool | None = None
    tools_enabled: bool | None = None
    system_metrics_interval_sec: int | None = Field(default=None, ge=2, le=120)
    allowed_applications: list[str] | None = None
    personality_preset: str | None = None


class OllamaTestResponse(BaseModel):
    ok: bool
    message: str
    models: list[str] = Field(default_factory=list)


class MemoryEntryCreate(BaseModel):
    category: Literal["preference", "fact", "summary"]
    content: str = Field(..., min_length=1, max_length=20_000)


class MemoryEntryOut(BaseModel):
    id: str
    category: str
    content: str
    created_at: float


class MemoryListResponse(BaseModel):
    entries: list[MemoryEntryOut]
    categories: list[str]


class SystemMetricsResponse(BaseModel):
    hostname: str
    os_name: str
    os_release: str
    machine: str
    cpu_percent: float | None = None
    memory_percent: float | None = None
    memory_used_mb: int | None = None
    memory_total_mb: int | None = None
    battery_percent: float | None = None
    battery_plugged: bool | None = None
    battery_available: bool = False
    uptime_seconds: float | None = None
    boot_timestamp: float | None = None
    utc_iso: str


class HealthFullResponse(BaseModel):
    backend_ok: bool
    ollama_reachable: bool
    ollama_model: str
    model_available: bool
    tools_enabled: bool
    memory_enabled: bool
    voice_enabled: bool
    memory_entry_count: int
    version: str = "0.2.0"


# --- Saved chat sessions (UI history; not assistant memory) ---


class ChatSessionCreate(BaseModel):
    title: str | None = Field(default=None, max_length=500)
    duplicate_from: str | None = Field(
        default=None,
        description="If set, copy messages/metadata from this session id",
    )


class ChatSessionPut(BaseModel):
    messages: list[dict[str, Any]] = Field(default_factory=list, max_length=2000)
    title: str | None = Field(default=None, max_length=500)
    summary: str | None = Field(default=None, max_length=20_000)
    metadata: dict[str, Any] | None = None


class ChatSessionPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    pinned: bool | None = None


class ChatSessionSummaryOut(BaseModel):
    id: str
    title: str
    created_at: float
    updated_at: float
    message_count: int
    pinned: bool = False


class ChatSessionListResponse(BaseModel):
    sessions: list[ChatSessionSummaryOut]


class ChatSessionFullOut(BaseModel):
    id: str
    title: str
    created_at: float
    updated_at: float
    summary: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    messages: list[dict[str, Any]] = Field(default_factory=list)
    pinned: bool = False


class VoiceTranscribeResponse(BaseModel):
    """
    Response for POST /api/voice/transcribe.

    Server STT is intentionally unimplemented; the web UI uses the browser
    Web Speech API when voice is enabled. Wire a local model here later.
    """

    implemented: bool = False
    text: str = ""
    message: str = (
        "Server-side transcription is not configured. "
        "The app uses the browser Web Speech API for microphone input, or you can "
        "implement this endpoint with a local STT service."
    )
