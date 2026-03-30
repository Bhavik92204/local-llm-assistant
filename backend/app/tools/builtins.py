"""
Safe, whitelisted tools only. No arbitrary shell execution.

Handlers receive (arguments, runtime) where runtime may include
allowed_applications from effective settings.
"""

from __future__ import annotations

import json
import os
import platform
import subprocess
import time
import webbrowser
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

import psutil

from app.logging_config import get_logger

log = get_logger("jarvis.tools")

# Windows-safe default paths (allowlist only; expand per-OS below)
_WIN_APP_PATHS: dict[str, str] = {
    "notepad": r"C:\Windows\System32\notepad.exe",
    "calculator": r"C:\Windows\System32\calc.exe",
    "mspaint": r"C:\Windows\System32\mspaint.exe",
}

# macOS: use `open -a` with bundle names (no shell interpolation)
_DARWIN_APP_NAMES: dict[str, str] = {
    "textedit": "TextEdit",
    "calculator": "Calculator",
}


def _runtime_allowed_apps(runtime: dict[str, Any] | None) -> list[str]:
    raw = (runtime or {}).get("allowed_applications")
    if isinstance(raw, list) and raw:
        return [str(x).lower().strip() for x in raw if str(x).strip()]
    return ["notepad", "calculator"]


def get_current_time(
    arguments: dict[str, Any] | None,
    runtime: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    log.info("tool get_current_time")
    return json.dumps(
        {
            "ok": True,
            "utc_iso": now.isoformat(),
            "unix": time.time(),
        }
    )


def open_website(
    arguments: dict[str, Any] | None,
    runtime: dict[str, Any] | None = None,
) -> str:
    args = arguments or {}
    url = (args.get("url") or "").strip()
    if not url:
        return json.dumps({"ok": False, "error": "Missing url"})
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return json.dumps({"ok": False, "error": "Only http and https URLs are allowed."})
    if not parsed.netloc:
        return json.dumps({"ok": False, "error": "Invalid URL."})
    log.info("tool open_website url=%s", url[:80])
    try:
        webbrowser.open(url)
        return json.dumps({"ok": True, "opened": url})
    except Exception as e:  # noqa: BLE001
        return json.dumps({"ok": False, "error": str(e)})


def get_system_info(
    arguments: dict[str, Any] | None,
    runtime: dict[str, Any] | None = None,
) -> str:
    """OS, CPU %, RAM %, hostname — read-only."""
    log.info("tool get_system_info")
    try:
        mem = psutil.virtual_memory()
        cpu = psutil.cpu_percent(interval=0.12)
    except Exception as e:  # noqa: BLE001
        return json.dumps({"ok": False, "error": str(e)})
    return json.dumps(
        {
            "ok": True,
            "hostname": platform.node(),
            "system": platform.system(),
            "release": platform.release(),
            "machine": platform.machine(),
            "python_version": platform.python_version(),
            "cpu_percent": cpu,
            "memory_percent": mem.percent,
            "memory_used_mb": int(mem.used // (1024 * 1024)),
            "memory_total_mb": int(mem.total // (1024 * 1024)),
        }
    )


def get_battery_status(
    arguments: dict[str, Any] | None,
    runtime: dict[str, Any] | None = None,
) -> str:
    log.info("tool get_battery_status")
    try:
        b = psutil.sensors_battery()
    except Exception as e:  # noqa: BLE001
        return json.dumps({"ok": False, "error": str(e), "available": False})
    if b is None:
        return json.dumps({"ok": True, "available": False, "message": "No battery reported"})
    return json.dumps(
        {
            "ok": True,
            "available": True,
            "percent": float(b.percent),
            "power_plugged": bool(b.power_plugged),
            "secs_left": b.secsleft,
        }
    )


def get_uptime(
    arguments: dict[str, Any] | None,
    runtime: dict[str, Any] | None = None,
) -> str:
    log.info("tool get_uptime")
    try:
        boot = psutil.boot_time()
        up = time.time() - boot
    except Exception as e:  # noqa: BLE001
        return json.dumps({"ok": False, "error": str(e)})
    return json.dumps(
        {
            "ok": True,
            "uptime_seconds": up,
            "boot_timestamp": boot,
        }
    )


def open_allowed_application(
    arguments: dict[str, Any] | None,
    runtime: dict[str, Any] | None = None,
) -> str:
    """
    Launch only allowlisted desktop apps via fixed paths (no shell).
    """
    args = arguments or {}
    app_id = (args.get("app_id") or "").strip().lower()
    allowed = _runtime_allowed_apps(runtime)
    if app_id not in allowed:
        return json.dumps(
            {
                "ok": False,
                "error": f"app_id not allowed. Allowed: {allowed}",
            }
        )

    system = platform.system()
    if system == "Darwin":
        bundle = _DARWIN_APP_NAMES.get(app_id)
        if not bundle:
            return json.dumps(
                {
                    "ok": False,
                    "error": f"No macOS mapping for '{app_id}'.",
                }
            )
        log.info("tool open_allowed_application darwin app=%s", app_id)
        try:
            subprocess.Popen(["open", "-a", bundle])  # noqa: S603
            return json.dumps({"ok": True, "launched": app_id, "bundle": bundle})
        except Exception as e:  # noqa: BLE001
            return json.dumps({"ok": False, "error": str(e)})

    path: str | None = None
    if system == "Windows":
        path = _WIN_APP_PATHS.get(app_id)

    if not path or not os.path.isfile(path):
        return json.dumps(
            {
                "ok": False,
                "error": f"No fixed path for '{app_id}' on {system}.",
            }
        )

    log.info("tool open_allowed_application path=%s", path)
    try:
        creationflags = 0
        if system == "Windows" and hasattr(subprocess, "CREATE_NO_WINDOW"):
            creationflags = subprocess.CREATE_NO_WINDOW  # type: ignore[attr-defined]
        subprocess.Popen([path], creationflags=creationflags)  # noqa: S603
        return json.dumps({"ok": True, "launched": app_id, "path": path})
    except Exception as e:  # noqa: BLE001
        return json.dumps({"ok": False, "error": str(e)})
