"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AssistantPhase, PanelId } from "@/types";

type AppShellContextValue = {
  panel: PanelId;
  setPanel: (p: PanelId) => void;
  phase: AssistantPhase;
  setPhase: (p: AssistantPhase) => void;
  activeToolLabel: string | null;
  setActiveToolLabel: (label: string | null) => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<PanelId>("chat");
  const [phase, setPhase] = useState<AssistantPhase>("ready");
  const [activeToolLabel, setActiveToolLabel] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      panel,
      setPanel,
      phase,
      setPhase,
      activeToolLabel,
      setActiveToolLabel,
    }),
    [panel, phase, activeToolLabel],
  );

  return (
    <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
  );
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    throw new Error("useAppShell must be used within AppShellProvider");
  }
  return ctx;
}

