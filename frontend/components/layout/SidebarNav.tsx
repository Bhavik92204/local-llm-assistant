"use client";

import { motion } from "framer-motion";
import { useAppShell } from "@/contexts/AppContext";
import type { PanelId } from "@/types";

const ITEMS: { id: PanelId; label: string; sub: string }[] = [
  { id: "chat", label: "Chat", sub: "Session" },
  { id: "tools", label: "Tools", sub: "Capabilities" },
  { id: "memory", label: "Memory", sub: "Local store" },
  { id: "system", label: "System", sub: "Metrics" },
  { id: "settings", label: "Settings", sub: "Config" },
];

export function SidebarNav() {
  const { panel, setPanel } = useAppShell();

  return (
    <nav className="flex shrink-0 flex-col gap-0.5 p-3">
      <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-jarvis-muted">
        Workspace
      </div>
      <ul className="space-y-0.5">
        {ITEMS.map((item) => {
          const active = panel === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setPanel(item.id)}
                className={`relative flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition ${
                  active
                    ? "bg-jarvis-border/60 text-jarvis-text ring-1 ring-jarvis-accent/25"
                    : "text-jarvis-muted hover:bg-jarvis-border/30 hover:text-jarvis-text"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-jarvis-accent/10 to-transparent"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative text-sm font-medium">{item.label}</span>
                <span className="relative font-mono text-[10px] text-jarvis-muted">
                  {item.sub}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
