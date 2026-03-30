from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import MemoryEntryCreate, MemoryEntryOut, MemoryListResponse
from app.services.memory_service import get_memory_service
from app.services.settings_service import load_settings_file

router = APIRouter(tags=["memory"])


def _check_mutations_allowed() -> None:
    if not load_settings_file().memory_enabled:
        raise HTTPException(
            status_code=403,
            detail="Memory is disabled in settings. Enable it to add or remove entries.",
        )


@router.get("/memory", response_model=MemoryListResponse)
async def list_memory(category: str | None = None) -> MemoryListResponse:
    svc = get_memory_service()
    rows = svc.list_all(category=category)
    entries = [
        MemoryEntryOut(
            id=r["id"], category=r["category"], content=r["content"], created_at=r["created_at"]
        )
        for r in rows
    ]
    return MemoryListResponse(
        entries=entries,
        categories=list(svc.CATEGORIES),
    )


@router.post("/memory", response_model=MemoryEntryOut)
async def add_memory(body: MemoryEntryCreate) -> MemoryEntryOut:
    _check_mutations_allowed()
    svc = get_memory_service()
    eid = svc.add(body.category, body.content)
    # fetch one — simple re-list filter
    for r in svc.list_all():
        if r["id"] == eid:
            return MemoryEntryOut(
                id=r["id"],
                category=r["category"],
                content=r["content"],
                created_at=r["created_at"],
            )
    raise HTTPException(status_code=500, detail="Failed to read new entry")


@router.delete("/memory/{entry_id}")
async def delete_memory(entry_id: str) -> dict[str, bool]:
    _check_mutations_allowed()
    svc = get_memory_service()
    ok = svc.delete(entry_id)
    return {"deleted": ok}


@router.delete("/memory/all")
async def clear_memory_all() -> dict[str, int]:
    _check_mutations_allowed()
    n = get_memory_service().clear_all()
    return {"deleted_count": n}
