"use client";

import { motion } from "framer-motion";

export function ChatEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-jarvis-border/70 bg-jarvis-surface/25 p-10 text-center"
    >
      <p className="text-sm text-jarvis-muted">
        Start a task or question. Replies come from your local Ollama model;
        tools execute only through the backend allowlist.
      </p>
      <p className="mt-3 text-xs text-jarvis-muted/80">
        Use <span className="font-mono">System</span> for metrics and{" "}
        <span className="font-mono">Settings</span> for model URL, toggles, and
        Ollama connectivity test.
      </p>
    </motion.div>
  );
}
