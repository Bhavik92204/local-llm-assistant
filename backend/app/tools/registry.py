"""
Central registry of tools exposed to Ollama and optional direct API calls.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Callable

from app.logging_config import get_logger
from app.tools import builtins

log = get_logger("jarvis.tools")

ToolHandler = Callable[
    [dict[str, Any] | None, dict[str, Any] | None],
    str,
]


@dataclass(frozen=True)
class RegisteredTool:
    name: str
    description: str
    parameters_schema: dict[str, Any]
    handler: ToolHandler

    def ollama_definition(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters_schema,
            },
        }


def _build_default_registry() -> "ToolRegistry":
    reg = ToolRegistry()
    reg.register(
        RegisteredTool(
            name="get_current_time",
            description="Returns the current UTC time (ISO 8601) and unix timestamp.",
            parameters_schema={"type": "object", "properties": {}, "required": []},
            handler=builtins.get_current_time,
        )
    )
    reg.register(
        RegisteredTool(
            name="open_website",
            description=(
                "Opens an http(s) URL in the default browser. "
                "Only when the user explicitly wants a page opened."
            ),
            parameters_schema={
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "Full URL, e.g. https://example.com",
                    }
                },
                "required": ["url"],
            },
            handler=builtins.open_website,
        )
    )
    reg.register(
        RegisteredTool(
            name="get_system_info",
            description=(
                "Read-only system snapshot: hostname, OS, CPU %, RAM %, "
                "memory MB. No file paths or secrets."
            ),
            parameters_schema={"type": "object", "properties": {}, "required": []},
            handler=builtins.get_system_info,
        )
    )
    reg.register(
        RegisteredTool(
            name="get_battery_status",
            description="Battery percent and plugged state if a battery is present.",
            parameters_schema={"type": "object", "properties": {}, "required": []},
            handler=builtins.get_battery_status,
        )
    )
    reg.register(
        RegisteredTool(
            name="get_uptime",
            description="System uptime in seconds since boot.",
            parameters_schema={"type": "object", "properties": {}, "required": []},
            handler=builtins.get_uptime,
        )
    )
    reg.register(
        RegisteredTool(
            name="open_allowed_application",
            description=(
                "Launch a desktop app from a strict allowlist only "
                "(e.g. notepad, calculator). app_id must be permitted in settings."
            ),
            parameters_schema={
                "type": "object",
                "properties": {
                    "app_id": {
                        "type": "string",
                        "description": "Allowlisted id, e.g. notepad, calculator",
                    }
                },
                "required": ["app_id"],
            },
            handler=builtins.open_allowed_application,
        )
    )
    return reg


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, RegisteredTool] = {}

    def register(self, tool: RegisteredTool) -> None:
        self._tools[tool.name] = tool

    def get(self, name: str) -> RegisteredTool | None:
        return self._tools.get(name)

    def list_ollama_tools(self) -> list[dict[str, Any]]:
        return [t.ollama_definition() for t in self._tools.values()]

    def list_tools_public(self) -> list[tuple[str, str]]:
        return [(t.name, t.description) for t in self._tools.values()]

    def execute(
        self,
        name: str,
        arguments: dict[str, Any] | None,
        runtime: dict[str, Any] | None = None,
    ) -> str:
        tool = self.get(name)
        if tool is None:
            log.warning("unknown tool requested: %s", name)
            return json.dumps({"ok": False, "error": f"Unknown tool: {name}"})
        try:
            out = tool.handler(arguments or {}, runtime)
            log.info("tool executed name=%s", name)
            return out
        except Exception as e:  # noqa: BLE001
            log.exception("tool error name=%s", name)
            return json.dumps({"ok": False, "error": str(e)})


_registry: ToolRegistry | None = None


def get_tool_registry() -> ToolRegistry:
    global _registry
    if _registry is None:
        _registry = _build_default_registry()
    return _registry
