"""
Voice subsystem boundaries.

Server-side speech-to-text is NOT implemented. The UI uses the browser Web Speech API
when voice is enabled in settings. This route exists so a future local STT service
can be wired in without changing the OpenAPI contract.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import VoiceTranscribeResponse

router = APIRouter(tags=["voice"])


@router.post(
    "/voice/transcribe",
    response_model=VoiceTranscribeResponse,
    summary="Server STT (not implemented)",
    description=(
        "Returns `implemented: false`. Replace with a real pipeline (e.g. Whisper) "
        "behind this path when ready. Client-side recognition does not call this endpoint."
    ),
)
async def transcribe() -> VoiceTranscribeResponse:
    return VoiceTranscribeResponse()
