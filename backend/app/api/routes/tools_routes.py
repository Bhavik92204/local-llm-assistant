from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException

from app.models.schemas import ToolExecuteRequest, ToolExecuteResponse, ToolInfo
from app.services.settings_service import get_effective_config
from app.tools.registry import get_tool_registry
from app.config import get_settings

router = APIRouter(tags=["tools"])


@router.get("/tools", response_model=list[ToolInfo])
async def list_tools() -> list[ToolInfo]:
    reg = get_tool_registry()
    return [ToolInfo(name=n, description=d) for n, d in reg.list_tools_public()]


@router.post("/tools/execute", response_model=ToolExecuteResponse)
async def execute_tool(body: ToolExecuteRequest) -> ToolExecuteResponse:
    s = get_settings()
    eff = get_effective_config(s)
    if not eff.tools_enabled:
        raise HTTPException(status_code=403, detail="Tools are disabled in settings.")
    reg = get_tool_registry()
    if reg.get(body.name) is None:
        raise HTTPException(status_code=404, detail=f"Unknown tool: {body.name}")
    runtime = {"allowed_applications": eff.allowed_applications}
    result = reg.execute(body.name, body.arguments, runtime)
    ok = True
    try:
        d = json.loads(result)
        if isinstance(d, dict) and d.get("ok") is False:
            ok = False
    except json.JSONDecodeError:
        pass
    return ToolExecuteResponse(result=result, ok=ok)
