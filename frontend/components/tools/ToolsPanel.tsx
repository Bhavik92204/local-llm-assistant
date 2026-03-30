"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchTools } from "@/lib/api";

export function ToolsPanel() {
  const [tools, setTools] = useState<{ name: string; description: string }[]>(
    [],
  );
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchTools()
      .then(setTools)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-jarvis-border/80 px-6 py-4">
        <h2 className="text-sm font-semibold">Tools</h2>
        <p className="text-xs text-jarvis-muted">
          Registered, allowlisted capabilities exposed to the model and UI.
        </p>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {err && (
          <p className="mb-4 text-sm text-rose-400/90">{err}</p>
        )}
        <ul className="mx-auto grid max-w-3xl gap-3">
          {tools.map((t, i) => (
            <motion.li
              key={t.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-jarvis-border/80 bg-jarvis-surface/30 p-4 ring-1 ring-black/20"
            >
              <div className="font-mono text-xs text-jarvis-accent">{t.name}</div>
              <p className="mt-1 text-sm text-jarvis-muted">{t.description}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
