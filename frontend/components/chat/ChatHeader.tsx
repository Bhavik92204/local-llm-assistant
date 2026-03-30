"use client";

import { fetchHealthFull } from "@/lib/api";

type Props = {
  modelLabel: string;
  sessionTitle: string;
  backendOk: boolean | null;
  ollamaOk: boolean | null;
  onNewChat: () => void;
  onExport: () => void;
  onShowHealth: (text: string | null) => void;
};

export function ChatHeader({
  modelLabel,
  sessionTitle,
  backendOk,
  ollamaOk,
  onNewChat,
  onExport,
  onShowHealth,
}: Props) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-jarvis-border/80 bg-jarvis-surface/40 px-6 py-4 backdrop-blur-sm">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold tracking-wide" title={sessionTitle}>
          {sessionTitle}
        </h2>
        <p className="text-xs text-jarvis-muted">
          Model:{" "}
          <span className="font-mono text-jarvis-text">{modelLabel}</span>
          {" · "}
          API:{" "}
          {backendOk === null ? (
            "…"
          ) : backendOk ? (
            <span className="text-emerald-400/90">online</span>
          ) : (
            <span className="text-rose-400/90">offline</span>
          )}
          {" · "}
          Ollama:{" "}
          {backendOk === false ? (
            "—"
          ) : ollamaOk ? (
            <span className="text-emerald-400/90">reachable</span>
          ) : (
            <span className="text-amber-400/90">unreachable</span>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onNewChat}
          className="rounded-lg border border-jarvis-border bg-jarvis-bg px-3 py-1.5 text-xs text-jarvis-muted transition hover:border-jarvis-accent/35 hover:text-jarvis-text"
        >
          New chat
        </button>
        <button
          type="button"
          onClick={onExport}
          className="rounded-lg border border-jarvis-border bg-jarvis-bg px-3 py-1.5 text-xs text-jarvis-muted transition hover:border-jarvis-accent/35 hover:text-jarvis-text"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() =>
            fetchHealthFull()
              .then((h) =>
                onShowHealth(
                  `Backend: ${h.backend_ok ? "ok" : "no"} · Ollama: ${h.ollama_reachable ? "ok" : "no"} · Model available: ${h.model_available} · Tools: ${h.tools_enabled} · Memory: ${h.memory_enabled} · Voice flag: ${h.voice_enabled} · Memory rows: ${h.memory_entry_count}`,
                ),
              )
              .catch(() =>
                onShowHealth(
                  "Could not load health. Is the API running and the Next.js proxy configured?",
                ),
              )
          }
          className="rounded-lg border border-jarvis-border bg-jarvis-bg px-3 py-1.5 text-xs text-jarvis-muted transition hover:border-jarvis-accent/35 hover:text-jarvis-text"
        >
          Health snapshot
        </button>
      </div>
    </header>
  );
}
