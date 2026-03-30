from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    ChatSessionCreate,
    ChatSessionFullOut,
    ChatSessionListResponse,
    ChatSessionPatch,
    ChatSessionPut,
    ChatSessionSummaryOut,
)
from app.services.chat_sessions_service import get_chat_sessions_service

router = APIRouter(tags=["chat-sessions"])


@router.get("/chats", response_model=ChatSessionListResponse)
async def list_chat_sessions(
    q: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=200, ge=1, le=500),
) -> ChatSessionListResponse:
    svc = get_chat_sessions_service()
    rows = svc.list_summaries(q=q, limit=limit)
    return ChatSessionListResponse(
        sessions=[ChatSessionSummaryOut(**r) for r in rows],
    )


@router.post("/chats", response_model=ChatSessionFullOut)
async def create_chat_session(body: ChatSessionCreate | None = None) -> ChatSessionFullOut:
    svc = get_chat_sessions_service()
    body = body or ChatSessionCreate()
    try:
        row = svc.create(title=body.title, duplicate_from=body.duplicate_from)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create session")
    return ChatSessionFullOut(**row)


@router.get("/chats/{session_id}", response_model=ChatSessionFullOut)
async def get_chat_session(session_id: str) -> ChatSessionFullOut:
    svc = get_chat_sessions_service()
    row = svc.get(session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    return ChatSessionFullOut(**row)


@router.put("/chats/{session_id}", response_model=ChatSessionFullOut)
async def put_chat_session(session_id: str, body: ChatSessionPut) -> ChatSessionFullOut:
    svc = get_chat_sessions_service()
    fs = body.model_fields_set
    ok = svc.replace_content(
        session_id,
        list(body.messages),
        title=body.title if "title" in fs else None,
        summary=body.summary if "summary" in fs else None,
        update_summary="summary" in fs,
        metadata=body.metadata if "metadata" in fs else None,
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Session not found")
    row = svc.get(session_id)
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    return ChatSessionFullOut(**row)


@router.patch("/chats/{session_id}", response_model=ChatSessionFullOut)
async def patch_chat_session(session_id: str, body: ChatSessionPatch) -> ChatSessionFullOut:
    svc = get_chat_sessions_service()
    patch = body.model_dump(exclude_unset=True)
    ok = svc.patch_fields(session_id, patch)
    if not ok:
        raise HTTPException(status_code=404, detail="Session not found")
    row = svc.get(session_id)
    assert row is not None
    return ChatSessionFullOut(**row)


@router.delete("/chats/{session_id}")
async def delete_chat_session(session_id: str) -> dict[str, bool]:
    svc = get_chat_sessions_service()
    deleted = svc.delete(session_id)
    return {"deleted": deleted}
