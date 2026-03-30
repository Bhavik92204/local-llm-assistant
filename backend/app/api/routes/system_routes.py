from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import SystemMetricsResponse
from app.services.system_service import collect_metrics

router = APIRouter(tags=["system"])


@router.get("/system/metrics", response_model=SystemMetricsResponse)
async def system_metrics() -> SystemMetricsResponse:
    data = collect_metrics()
    return SystemMetricsResponse(**data)
