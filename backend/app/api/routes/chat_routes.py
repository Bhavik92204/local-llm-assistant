from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.chat_service import run_chat
from app.logging_config import get_logger
from app.models.schemas import ChatRequest, ChatResponse, ToolEventOut
from app.ollama_client import OllamaError
from app.services.settings_service import get_effective_config
from app.config import get_settings

log = get_logger("jarvis.api.chat")
router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    s = get_settings()
    eff = get_effective_config(s)
    msgs = [{"role": m.role, "content": m.content} for m in body.messages]
    try:
        text, events, memory_used = await run_chat(msgs, effective=eff)
    except OllamaError as e:
        log.warning("ollama chat failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail=(
                "The model service (Ollama) did not return a usable response. "
                f"Details: {e}"
            ),
        ) from e
    tool_out = [
        ToolEventOut(tool=e["tool"], ok=e["ok"], detail=e.get("detail"))
        for e in events
    ]
    return ChatResponse(
        message=text or "",
        model=eff.ollama_model,
        tool_events=tool_out,
        memory_used=memory_used,
    )
