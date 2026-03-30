"""
Orchestrates chat + tool rounds with Ollama.

Builds the full `messages` array (system + history + tool turns) before each
`ollama_chat_messages` call. Personality lives in app.config.personality, not in
the Ollama HTTP client.
"""

from __future__ import annotations

import json
from typing import Any

from app.logging_config import get_logger
from app.ollama_client import OllamaError, ollama_chat_messages
from app.config.personality import resolve_system_prompt
from app.services.memory_service import get_memory_service
from app.services.settings_service import EffectiveConfig
from app.tools.registry import get_tool_registry

log = get_logger("jarvis.chat")


def _normalize_tool_arguments(raw: Any) -> dict[str, Any]:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _message_from_response(data: dict[str, Any]) -> dict[str, Any]:
    msg = data.get("message") or {}
    if not isinstance(msg, dict):
        return {"role": "assistant", "content": ""}
    return msg


def _parse_tool_ok(result_json: str) -> tuple[bool, str | None]:
    try:
        d = json.loads(result_json)
        if isinstance(d, dict):
            if "ok" in d:
                return bool(d["ok"]), d.get("error") or d.get("message")
            if "error" in d:
                return False, str(d["error"])
        return True, None
    except json.JSONDecodeError:
        return True, None


async def run_chat(
    user_messages: list[dict[str, str]],
    effective: EffectiveConfig,
) -> tuple[str, list[dict[str, Any]], bool]:
    """
    Run chat with system prompt, optional memory block, optional tools.
    Returns (assistant_text, tool_events, memory_used).
    """
    registry = get_tool_registry()
    tools = registry.list_ollama_tools() if effective.tools_enabled else []

    system_content = resolve_system_prompt(effective.assistant_personality)
    memory_used = False
    if effective.memory_enabled:
        mem = get_memory_service()
        block = mem.format_for_prompt()
        if block:
            memory_used = True
            system_content += (
                "\n\n---\nLocal memory (user-stored facts/preferences/summaries):\n"
                + block
            )

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_content},
    ]
    for m in user_messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    runtime = {"allowed_applications": effective.allowed_applications}
    tool_events: list[dict[str, Any]] = []

    rounds = 0
    last_assistant_text = ""

    while rounds < effective.max_tool_rounds:
        rounds += 1
        try:
            data = await ollama_chat_messages(
                effective.ollama_base_url,
                effective.ollama_model,
                messages,
                tools=tools or None,
            )
        except OllamaError:
            raise

        msg = _message_from_response(data)
        messages.append(msg)

        tool_calls = msg.get("tool_calls")
        if not tool_calls:
            last_assistant_text = msg.get("content") or ""
            break

        for call in tool_calls:
            if not isinstance(call, dict):
                continue
            fn = call.get("function") or {}
            name = fn.get("name") or ""
            args = _normalize_tool_arguments(fn.get("arguments"))
            result = registry.execute(name, args, runtime)
            ok, detail = _parse_tool_ok(result)
            tool_events.append({"tool": name, "ok": ok, "detail": detail})
            log.info("tool round tool=%s ok=%s", name, ok)

            tool_msg: dict[str, Any] = {
                "role": "tool",
                "content": result,
                "name": name,
            }
            if call.get("id"):
                tool_msg["tool_call_id"] = call["id"]
            messages.append(tool_msg)

        last_assistant_text = msg.get("content") or ""

    if not last_assistant_text.strip():
        last_assistant_text = (
            "No text reply was returned. If the model used tools, it may follow up on the next turn; "
            "otherwise verify Ollama and that your model supports tool calling."
        )

    return last_assistant_text, tool_events, memory_used
