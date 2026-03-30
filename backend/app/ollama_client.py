"""
HTTP transport for Ollama's REST API only.

Responsibilities: build URLs, POST/GET JSON, parse responses, map errors.
Does not inject system prompts, personality, memory, or tools definitions — callers
pass the final `messages` and optional `tools` payloads.
"""

from __future__ import annotations

import json
from typing import Any

import httpx


class OllamaError(Exception):
    """Raised when Ollama returns an error or is unreachable."""


async def ollama_chat_messages(
    base_url: str,
    model: str,
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
    timeout: float = 120.0,
) -> dict[str, Any]:
    """
    POST /api/chat with stream=false.
    """
    url = f"{base_url.rstrip('/')}/api/chat"
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": False,
    }
    if tools:
        body["tools"] = tools

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.post(url, json=body)
        except httpx.RequestError as e:
            raise OllamaError(f"Cannot reach Ollama at {url}: {e}") from e

    if resp.status_code != 200:
        if tools and resp.status_code >= 400:
            return await ollama_chat_messages(
                base_url, model, messages, tools=None, timeout=timeout
            )
        try:
            detail = resp.json()
        except json.JSONDecodeError:
            detail = resp.text
        raise OllamaError(f"Ollama error {resp.status_code}: {detail}")

    try:
        return resp.json()
    except json.JSONDecodeError as e:
        raise OllamaError(f"Invalid JSON from Ollama: {resp.text[:500]}") from e


async def ollama_list_models(base_url: str, timeout: float = 10.0) -> list[str]:
    url = f"{base_url.rstrip('/')}/api/tags"
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.get(url)
        except httpx.RequestError:
            return []
    if resp.status_code != 200:
        return []
    data = resp.json()
    models = data.get("models") or []
    return [m.get("name", "") for m in models if m.get("name")]


async def ollama_ping(base_url: str, timeout: float = 5.0) -> bool:
    url = f"{base_url.rstrip('/')}/api/tags"
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            r = await client.get(url)
            return r.status_code == 200
        except httpx.RequestError:
            return False


def model_is_available(installed: list[str], configured: str) -> bool:
    if not configured or not installed:
        return False
    if configured in installed:
        return True
    return any(
        m == configured or m.startswith(f"{configured}:")
        or m.split(":")[0] == configured
        for m in installed
    )
