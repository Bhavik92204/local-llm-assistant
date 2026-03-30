"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  fetchHealthFull,
  fetchSettings,
  fetchStatus,
  fetchSystemMetrics,
  type HealthFull,
  type SystemMetrics,
} from "@/lib/api";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-jarvis-border/80 bg-jarvis-surface/30 p-4 ring-1 ring-black/15">
      <div className="font-mono text-[10px] uppercase tracking-wider text-jarvis-muted">
        {title}
      </div>
      <div className="mt-2 text-sm text-jarvis-text">{children}</div>
    </div>
  );
}

export function SystemDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [health, setHealth] = useState<HealthFull | null>(null);
  const [status, setStatus] = useState<{
    model: string;
    ollama: boolean;
    model_available: boolean;
  } | null>(null);
  const [intervalSec, setIntervalSec] = useState(8);
  const [err, setErr] = useState<string | null>(null);

  const tick = useCallback(async () => {
    setErr(null);
    try {
      const [m, h, st] = await Promise.all([
        fetchSystemMetrics(),
        fetchHealthFull(),
        fetchStatus(),
      ]);
      setMetrics(m);
      setHealth(h);
      setStatus({
        model: st.configured_model,
        ollama: st.ollama_reachable,
        model_available: Boolean(st.model_available),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Refresh failed");
    }
  }, []);

  useEffect(() => {
    fetchSettings()
      .then((s) =>
        setIntervalSec(Math.max(3, s.file.system_metrics_interval_sec)),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    void tick();
    const id = window.setInterval(() => void tick(), intervalSec * 1000);
    return () => window.clearInterval(id);
  }, [tick, intervalSec]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-jarvis-border/80 px-6 py-4">
        <h2 className="text-sm font-semibold">System</h2>
        <p className="text-xs text-jarvis-muted">
          Local metrics and service health · refreshes every {intervalSec}s
          (configure in Settings).
        </p>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {err && (
          <p className="mb-4 text-sm text-rose-400/90">{err}</p>
        )}
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <motion.div layout>
            <Card title="Backend">
              {health ? (
                <span
                  className={
                    health.backend_ok ? "text-emerald-400/90" : "text-rose-400/90"
                  }
                >
                  {health.backend_ok ? "Operational" : "Degraded"}
                </span>
              ) : (
                "…"
              )}
            </Card>
          </motion.div>
          <Card title="Ollama">
            {status ? (
              <span
                className={
                  status.ollama ? "text-emerald-400/90" : "text-amber-400/90"
                }
              >
                {status.ollama ? "Reachable" : "Unreachable"}
              </span>
            ) : (
              "…"
            )}
          </Card>
          <Card title="Model">
            {status ? (
              <>
                <div className="font-mono text-xs">{status.model}</div>
                <div className="mt-1 text-xs text-jarvis-muted">
                  Available:{" "}
                  {status.model_available ? (
                    <span className="text-emerald-400/90">yes</span>
                  ) : (
                    <span className="text-amber-400/90">no / check pull</span>
                  )}
                </div>
              </>
            ) : (
              "…"
            )}
          </Card>
          <Card title="Host">
            {metrics?.hostname ?? "—"}
          </Card>
          <Card title="OS">
            {metrics
              ? `${metrics.os_name} ${metrics.os_release} (${metrics.machine})`
              : "—"}
          </Card>
          <Card title="CPU">
            {metrics?.cpu_percent != null
              ? `${metrics.cpu_percent.toFixed(1)}%`
              : "—"}
          </Card>
          <Card title="Memory">
            {metrics
              ? `${metrics.memory_percent?.toFixed(1)}% · ${metrics.memory_used_mb} / ${metrics.memory_total_mb} MiB`
              : "—"}
          </Card>
          <Card title="Battery">
            {metrics?.battery_available
              ? `${metrics.battery_percent?.toFixed(0)}%${
                  metrics.battery_plugged ? " (plugged)" : ""
                }`
              : "N/A or desktop"}
          </Card>
          <Card title="Uptime">
            {metrics?.uptime_seconds != null
              ? `${(metrics.uptime_seconds / 3600).toFixed(2)} h`
              : "—"}
          </Card>
          <Card title="UTC time">
            {metrics?.utc_iso ?? "—"}
          </Card>
          <Card title="Flags">
            {health ? (
              <ul className="space-y-1 text-xs text-jarvis-muted">
                <li>tools: {String(health.tools_enabled)}</li>
                <li>memory: {String(health.memory_enabled)}</li>
                <li>voice: {String(health.voice_enabled)}</li>
                <li>memory rows: {health.memory_entry_count}</li>
              </ul>
            ) : (
              "…"
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
