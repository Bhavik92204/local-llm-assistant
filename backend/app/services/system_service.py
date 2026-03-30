"""
Local system metrics for dashboard and tools (read-only).
"""

from __future__ import annotations

import platform
import time
from datetime import datetime, timezone

import psutil


def collect_metrics() -> dict:
    """Return a plain dict matching SystemMetricsResponse fields."""
    now = datetime.now(timezone.utc)
    hostname = platform.node() or "unknown"

    boot = None
    uptime = None
    try:
        boot = float(psutil.boot_time())
        uptime = time.time() - boot
    except Exception:
        pass

    mem_pct = None
    mem_used = None
    mem_total = None
    try:
        mem = psutil.virtual_memory()
        mem_pct = float(mem.percent)
        mem_used = int(mem.used // (1024 * 1024))
        mem_total = int(mem.total // (1024 * 1024))
    except Exception:
        pass

    cpu = None
    try:
        cpu = psutil.cpu_percent(interval=0.15)
    except Exception:
        cpu = None

    battery_pct = None
    plugged = None
    batt_avail = False
    try:
        b = psutil.sensors_battery()
        if b is not None:
            batt_avail = True
            battery_pct = float(b.percent)
            plugged = bool(b.power_plugged)
    except Exception:
        pass

    return {
        "hostname": hostname,
        "os_name": platform.system(),
        "os_release": platform.release(),
        "machine": platform.machine(),
        "cpu_percent": cpu,
        "memory_percent": mem_pct,
        "memory_used_mb": mem_used,
        "memory_total_mb": mem_total,
        "battery_percent": battery_pct,
        "battery_plugged": plugged,
        "battery_available": batt_avail,
        "uptime_seconds": float(uptime) if uptime is not None else None,
        "boot_timestamp": boot,
        "utc_iso": now.isoformat(),
    }
