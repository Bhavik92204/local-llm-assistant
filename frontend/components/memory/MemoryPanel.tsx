"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  addMemory,
  clearAllMemory,
  deleteMemoryEntry,
  fetchMemory,
  fetchSettings,
  type MemoryEntry,
} from "@/lib/api";

export function MemoryPanel() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filter, setFilter] = useState<string | "">("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"preference" | "fact" | "summary">(
    "fact",
  );
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const s = await fetchSettings();
      setMemoryEnabled(s.file.memory_enabled);
      const m = await fetchMemory(filter || undefined);
      setEntries(m.entries);
      setCategories(m.categories);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load memory");
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd() {
    setErr(null);
    try {
      await addMemory(category, content);
      setContent("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not add");
    }
  }

  async function onDelete(id: string) {
    setErr(null);
    try {
      await deleteMemoryEntry(id);
      await load();
    } catch {
      setErr("Delete failed");
    }
  }

  async function onClearAll() {
    if (!window.confirm("Clear all stored memory entries?")) return;
    setErr(null);
    try {
      await clearAllMemory();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Clear failed");
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-jarvis-border/80 px-6 py-4">
        <h2 className="text-sm font-semibold">Memory</h2>
        <p className="text-xs text-jarvis-muted">
          Lightweight SQLite store · injected into chat when enabled in Settings.
        </p>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {!memoryEnabled && (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
              Memory is disabled. Enable it under Settings to add entries or use
              retrieval in chat.
            </p>
          )}
          {err && (
            <p className="text-sm text-rose-400/90">{err}</p>
          )}

          <div className="rounded-xl border border-jarvis-border/80 bg-jarvis-surface/25 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-jarvis-muted">
                Category
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as typeof category)
                  }
                  disabled={!memoryEnabled}
                  className="mt-1 w-full rounded-lg border border-jarvis-border bg-jarvis-bg px-3 py-2 text-sm"
                >
                  <option value="preference">preference</option>
                  <option value="fact">fact</option>
                  <option value="summary">summary</option>
                </select>
              </label>
              <label className="text-xs text-jarvis-muted">
                Filter list
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-jarvis-border bg-jarvis-bg px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-3 block text-xs text-jarvis-muted">
              Content
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={!memoryEnabled}
                rows={3}
                className="mt-1 w-full rounded-lg border border-jarvis-border bg-jarvis-bg px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!memoryEnabled || !content.trim()}
                onClick={() => void onAdd()}
                className="rounded-lg bg-jarvis-accent px-4 py-2 text-sm font-medium text-jarvis-bg disabled:opacity-40"
              >
                Save entry
              </button>
              <button
                type="button"
                disabled={!memoryEnabled}
                onClick={() => void onClearAll()}
                className="rounded-lg border border-rose-500/40 px-4 py-2 text-sm text-rose-200/90 disabled:opacity-40"
              >
                Clear all
              </button>
            </div>
          </div>

          <ul className="space-y-2">
            {entries.map((e) => (
              <motion.li
                key={e.id}
                layout
                className="flex gap-3 rounded-xl border border-jarvis-border/70 bg-jarvis-bg/40 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] uppercase text-jarvis-muted">
                    {e.category}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-jarvis-text">
                    {e.content}
                  </p>
                  <div className="mt-1 font-mono text-[10px] text-jarvis-muted">
                    {new Date(e.created_at * 1000).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!memoryEnabled}
                  onClick={() => void onDelete(e.id)}
                  className="self-start rounded-md border border-jarvis-border px-2 py-1 text-[10px] text-jarvis-muted hover:text-rose-300 disabled:opacity-40"
                >
                  Delete
                </button>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
