import type { ChatMessage, ToolEvent } from "@/types";

export function chatMessageToRecord(m: ChatMessage): Record<string, unknown> {
  const o: Record<string, unknown> = {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
  };
  if (m.toolEvents?.length) o.toolEvents = m.toolEvents;
  if (m.memoryUsed != null) o.memoryUsed = m.memoryUsed;
  return o;
}

export function recordToChatMessage(r: Record<string, unknown>): ChatMessage {
  const toolEvents = r.toolEvents;
  return {
    id: String(r.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    role: r.role === "assistant" ? "assistant" : "user",
    content: String(r.content ?? ""),
    createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
    toolEvents: Array.isArray(toolEvents)
      ? (toolEvents as ToolEvent[])
      : undefined,
    memoryUsed: typeof r.memoryUsed === "boolean" ? r.memoryUsed : undefined,
  };
}

export function recordsToMessages(rows: unknown[]): ChatMessage[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
    .map(recordToChatMessage);
}
