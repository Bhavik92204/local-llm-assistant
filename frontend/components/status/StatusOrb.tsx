"use client";

import { motion } from "framer-motion";
import type { AssistantPhase } from "@/types";

const LABELS: Record<AssistantPhase, string> = {
  ready: "Ready",
  thinking: "Thinking",
  listening: "Listening",
  speaking: "Speaking",
  tool_active: "Tool active",
  error: "Error",
};

export function StatusOrb({ phase }: { phase: AssistantPhase }) {
  const pulse =
    phase === "thinking" || phase === "listening" || phase === "speaking";
  const color =
    phase === "error"
      ? "bg-rose-500/90 shadow-[0_0_20px_rgba(244,63,94,0.35)]"
      : phase === "tool_active"
        ? "bg-violet-400/90 shadow-[0_0_18px_rgba(167,139,250,0.35)]"
        : "bg-emerald-400/90 shadow-[0_0_16px_rgba(52,211,153,0.25)]";

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-9 w-9 items-center justify-center">
        {pulse && (
          <motion.span
            className={`absolute inset-0 rounded-full ${color} opacity-40`}
            animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0.08, 0.35] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <span
          className={`relative z-10 h-3 w-3 rounded-full ${color}`}
          aria-hidden
        />
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-jarvis-muted">
          Assistant
        </div>
        <div className="text-sm font-medium tracking-tight text-jarvis-text">
          {LABELS[phase]}
        </div>
      </div>
    </div>
  );
}
