/**
 * API client. Browser uses same-origin `/jarvis-api/*` (Next rewrite → FastAPI /api/*).
 */

import { errorTextFromResponse } from "@/lib/parseApiError";

function apiBase(): string {
  if (typeof window !== "undefined") return "/jarvis-api";
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000"
  );
}

function joinApi(path: string): string {
  const b = apiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

async function parseJson<T>(r: Response): Promise<T> {
  try {
    return (await r.json()) as T;
  } catch {
    throw new Error("Invalid JSON from server.");
  }
}

export type ChatRole = "user" | "assistant";

export type ChatMessagePayload = { role: ChatRole; content: string };

export type ToolEventPayload = {
  tool: string;
  ok: boolean;
  detail?: string | null;
};

export type StatusPayload = {
  ollama_reachable: boolean;
  configured_model: string;
  models_installed: string[];
  model_available?: boolean;
};

export type SystemMetrics = {
  hostname: string;
  os_name: string;
  os_release: string;
  machine: string;
  cpu_percent: number | null;
  memory_percent: number | null;
  memory_used_mb: number | null;
  memory_total_mb: number | null;
  battery_percent: number | null;
  battery_plugged: boolean | null;
  battery_available: boolean;
  uptime_seconds: number | null;
  boot_timestamp: number | null;
  utc_iso: string;
};

export type HealthFull = {
  backend_ok: boolean;
  ollama_reachable: boolean;
  ollama_model: string;
  model_available: boolean;
  tools_enabled: boolean;
  memory_enabled: boolean;
  voice_enabled: boolean;
  memory_entry_count: number;
  version?: string;
};

export type SettingsPayload = {
  effective: Record<string, unknown>;
  file: {
    ollama_base_url: string;
    ollama_model: string;
    memory_enabled: boolean;
    voice_enabled: boolean;
    tools_enabled: boolean;
    system_metrics_interval_sec: number;
    allowed_applications: string[];
    personality_preset: string;
  };
  env_fallback: Record<string, string>;
  personality_preset_keys: string[];
};

export type MemoryEntry = {
  id: string;
  category: string;
  content: string;
  created_at: number;
};

export async function fetchStatus(): Promise<StatusPayload> {
  const r = await fetch(joinApi("/status"), { cache: "no-store" });
  if (!r.ok) throw new Error(await errorTextFromResponse(r));
  return parseJson<StatusPayload>(r);
}

export async function fetchHealthFull(): Promise<HealthFull> {
  const r = await fetch(joinApi("/health/full"), { cache: "no-store" });
  if (!r.ok) throw new Error(await errorTextFromResponse(r));
  return parseJson<HealthFull>(r);
}

export async function fetchSystemMetrics(): Promise<SystemMetrics> {
  const r = await fetch(joinApi("/system/metrics"), { cache: "no-store" });
  if (!r.ok) throw new Error(await errorTextFromResponse(r));
  return parseJson<SystemMetrics>(r);
}

export async function fetchSettings(): Promise<SettingsPayload> {
  const r = await fetch(joinApi("/settings"), { cache: "no-store" });
  if (!r.ok) throw new Error(await errorTextFromResponse(r));
  return parseJson<SettingsPayload>(r);
}

export async function saveSettings(
  patch: Partial<SettingsPayload["file"]>,
): Promise<SettingsPayload> {
  const r = await fetch(joinApi("/settings"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) {
    throw new Error(await errorTextFromResponse(r));
  }
  return parseJson<SettingsPayload>(r);
}

export async function testOllamaConnection(): Promise<{
  ok: boolean;
  message: string;
  models: string[];
}> {
  const r = await fetch(joinApi("/settings/test-ollama"), { method: "POST" });
  if (!r.ok) throw new Error(await errorTextFromResponse(r));
  return parseJson(r);
}

export async function fetchMemory(category?: string): Promise<{
  entries: MemoryEntry[];
  categories: string[];
}> {
  const q = category ? `?category=${encodeURIComponent(category)}` : "";
  const r = await fetch(joinApi(`/memory${q}`), { cache: "no-store" });
  if (!r.ok) throw new Error(await errorTextFromResponse(r));
  return parseJson(r);
}

export async function addMemory(
  category: "preference" | "fact" | "summary",
  content: string,
): Promise<MemoryEntry> {
  const r = await fetch(joinApi("/memory"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, content }),
  });
  if (!r.ok) throw new Error(await errorTextFromResponse(r));
  return parseJson<MemoryEntry>(r);
}

export async function deleteMemoryEntry(id: string): Promise<boolean> {
  const r = await fetch(joinApi(`/memory/${encodeURIComponent(id)}`), {
    method: "DELETE",
  });
  if (!r.ok) return false;
  const j = await parseJson<{ deleted?: boolean }>(r);
  return Boolean(j.deleted);
}

export async function clearAllMemory(): Promise<number> {
  const r = await fetch(joinApi("/memory/all"), { method: "DELETE" });
  if (!r.ok) throw new Error(await errorTextFromResponse(r));
  const j = await parseJson<{ deleted_count?: number }>(r);
  return Number(j.deleted_count ?? 0);
}

export async function fetchTools(): Promise<{ name: string; description: string }[]> {
  const r = await fetch(joinApi("/tools"), { cache: "no-store" });
  if (!r.ok) throw new Error(await errorTextFromResponse(r));
  return parseJson(r);
}

export async function sendChat(messages: ChatMessagePayload[]): Promise<{
  message: string;
  model: string;
  tool_events?: ToolEventPayload[];
  memory_used?: boolean;
}> {
  const r = await fetch(joinApi("/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!r.ok) {
    throw new Error(await errorTextFromResponse(r));
  }
  return parseJson(r);
}

// --- Saved chat sessions (UI history; separate from /memory) ---

export type ChatSessionSummary = {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  message_count: number;
  pinned?: boolean;
};

export type ChatSessionFull = {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  summary: string | null;
  metadata: Record<string, unknown>;
  messages: Record<string, unknown>[];
  pinned?: boolean;
};

export async function listChatSessions(
  q?: string,
  limit = 200,
): Promise<ChatSessionSummary[]> {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  params.set("limit", String(limit));
  const r = await fetch(joinApi(`/chats?${params}`), { cache: "no-store" });
  if (!r.ok) throw new Error(await errorTextFromResponse(r));
  const j = await parseJson<{ sessions: ChatSessionSummary[] }>(r);
  return j.sessions ?? [];
}

export async function createChatSession(body?: {
  title?: string;
  duplicate_from?: string;
}): Promise<ChatSessionFull> {
  const r = await fetch(joinApi("/chats"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!r.ok) throw new Error(await errorTextFromResponse(r));
  return parseJson<ChatSessionFull>(r);
}

export async function getChatSession(id: string): Promise<ChatSessionFull> {
  const r = await fetch(joinApi(`/chats/${encodeURIComponent(id)}`), {
    cache: "no-store",
  });
  if (!r.ok) throw new Error(await errorTextFromResponse(r));
  return parseJson<ChatSessionFull>(r);
}

export async function putChatSession(
  id: string,
  body: {
    messages: Record<string, unknown>[];
    title?: string;
    summary?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<ChatSessionFull> {
  const r = await fetch(joinApi(`/chats/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await errorTextFromResponse(r));
  return parseJson<ChatSessionFull>(r);
}

export async function patchChatSession(
  id: string,
  body: { title?: string; pinned?: boolean },
): Promise<ChatSessionFull> {
  const r = await fetch(joinApi(`/chats/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await errorTextFromResponse(r));
  return parseJson<ChatSessionFull>(r);
}

export async function deleteChatSession(id: string): Promise<boolean> {
  const r = await fetch(joinApi(`/chats/${encodeURIComponent(id)}`), {
    method: "DELETE",
  });
  if (!r.ok) return false;
  const j = await parseJson<{ deleted?: boolean }>(r);
  return Boolean(j.deleted);
}
