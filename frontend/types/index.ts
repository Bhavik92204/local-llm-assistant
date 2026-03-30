export type PanelId = "chat" | "tools" | "memory" | "system" | "settings";

export type AssistantPhase =
  | "ready"
  | "thinking"
  | "listening"
  | "speaking"
  | "tool_active"
  | "error";

export type ChatRole = "user" | "assistant";

export type ToolEvent = {
  tool: string;
  ok: boolean;
  detail?: string | null;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  toolEvents?: ToolEvent[];
  /** Backend injected local memory into system context */
  memoryUsed?: boolean;
};
