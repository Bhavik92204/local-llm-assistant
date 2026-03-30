"use client";

import { AnimatePresence, motion } from "framer-motion";
import { SavedChatsSidebar } from "@/components/layout/SavedChatsSidebar";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { StatusOrb } from "@/components/status/StatusOrb";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ToolsPanel } from "@/components/tools/ToolsPanel";
import { MemoryPanel } from "@/components/memory/MemoryPanel";
import { SystemDashboard } from "@/components/system/SystemDashboard";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { useAppShell } from "@/contexts/AppContext";

export function AppShell() {
  const { panel, phase, activeToolLabel } = useAppShell();

  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden bg-jarvis-bg text-jarvis-text">
      <aside className="flex min-h-0 w-[260px] shrink-0 flex-col border-r border-jarvis-border/90 bg-jarvis-surface/90 backdrop-blur-md">
        <div className="border-b border-jarvis-border/80 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-jarvis-muted">
            Local
          </div>
          <h1 className="mt-1 text-lg font-semibold tracking-tight">
            Assistant
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-jarvis-muted">
            Private runtime · Ollama · Modular tools
          </p>
        </div>

        <div className="border-b border-jarvis-border/80 px-4 py-4">
          <StatusOrb phase={phase} />
          {activeToolLabel && (
            <p className="mt-3 rounded-lg bg-violet-500/10 px-2 py-1.5 font-mono text-[10px] text-violet-200/90 ring-1 ring-violet-500/20">
              {activeToolLabel}
            </p>
          )}
        </div>

        <SavedChatsSidebar />
        <SidebarNav />

        <div className="mt-auto border-t border-jarvis-border/80 p-4 text-[10px] text-jarvis-muted">
          v0.2 · modular platform
        </div>
      </aside>

      <main className="relative min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={panel}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex h-full flex-col"
          >
            {panel === "chat" && <ChatPanel />}
            {panel === "tools" && <ToolsPanel />}
            {panel === "memory" && <MemoryPanel />}
            {panel === "system" && <SystemDashboard />}
            {panel === "settings" && <SettingsPanel />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
