"use client";

import { useState } from "react";
import { useChatSession } from "@/contexts/ChatSessionContext";

function formatUpdated(ts: number) {
  try {
    const d = new Date(ts * 1000);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function SavedChatsSidebar() {
  const {
    sessions,
    activeSessionId,
    openSession,
    startNewChat,
    deleteSession,
    togglePinSession,
    duplicateSession,
    renameSession,
    searchQuery,
    setSearchQuery,
    listError,
    isHydrated,
  } = useChatSession();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);

  function beginRename(s: { id: string; title: string }) {
    setEditingId(s.id);
    setEditValue(s.title);
    setMenuId(null);
  }

  async function commitRename(id: string) {
    await renameSession(id, editValue);
    setEditingId(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-jarvis-border/80 px-2 pb-2 pt-3">
      <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-jarvis-muted">
        Conversations
      </div>
      <button
        type="button"
        onClick={() => void startNewChat()}
        className="mx-2 mt-2 rounded-lg bg-jarvis-accent/90 px-3 py-2 text-left text-xs font-medium text-jarvis-bg transition hover:bg-jarvis-accent"
      >
        + New chat
      </button>
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search chats…"
        className="mx-2 mt-2 rounded-lg border border-jarvis-border bg-jarvis-bg px-2 py-1.5 text-xs text-jarvis-text placeholder:text-jarvis-muted/70"
      />
      {listError && (
        <p className="mx-2 mt-2 text-[11px] text-amber-400/90">{listError}</p>
      )}
      <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1">
        {!isHydrated && (
          <li className="px-2 py-3 text-xs text-jarvis-muted">Loading…</li>
        )}
        {isHydrated && sessions.length === 0 && (
          <li className="px-2 py-4 text-center text-xs leading-relaxed text-jarvis-muted">
            No saved chats yet. Send a message to create your first conversation.
          </li>
        )}
        {sessions.map((s) => {
          const active = s.id === activeSessionId;
          return (
            <li key={s.id} className="relative">
              {editingId === s.id ? (
                <div className="flex gap-1 px-1 py-0.5">
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitRename(s.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="min-w-0 flex-1 rounded border border-jarvis-border bg-jarvis-bg px-2 py-1 text-xs"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="rounded border border-jarvis-border px-2 text-[10px] text-jarvis-muted"
                    onClick={() => void commitRename(s.id)}
                  >
                    OK
                  </button>
                </div>
              ) : (
                <div
                  className={`group flex items-start gap-1 rounded-lg px-2 py-1.5 transition ${
                    active
                      ? "bg-jarvis-border/50 ring-1 ring-jarvis-accent/30"
                      : "hover:bg-jarvis-border/25"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void openSession(s.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-1">
                      {s.pinned && (
                        <span
                          className="font-mono text-[9px] text-jarvis-accent"
                          title="Pinned"
                        >
                          PIN
                        </span>
                      )}
                      <span className="line-clamp-2 text-xs font-medium text-jarvis-text">
                        {s.title}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-jarvis-muted">
                      {formatUpdated(s.updated_at)} · {s.message_count} msg
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-col gap-0.5 opacity-80 group-hover:opacity-100">
                    <button
                      type="button"
                      title="More"
                      className="rounded px-1 text-[10px] text-jarvis-muted hover:bg-jarvis-border/40 hover:text-jarvis-text"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId((m) => (m === s.id ? null : s.id));
                      }}
                    >
                      ⋮
                    </button>
                  </div>
                </div>
              )}
              {menuId === s.id && editingId !== s.id && (
                <div
                  className="absolute right-1 top-8 z-10 min-w-[140px] rounded-lg border border-jarvis-border bg-jarvis-bg py-1 text-xs shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                  role="menu"
                >
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left hover:bg-jarvis-border/30"
                    onClick={() => {
                      void togglePinSession(s.id, !s.pinned);
                      setMenuId(null);
                    }}
                  >
                    {s.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left hover:bg-jarvis-border/30"
                    onClick={() => beginRename(s)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left hover:bg-jarvis-border/30"
                    onClick={() => {
                      void duplicateSession(s.id);
                      setMenuId(null);
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-rose-400/90 hover:bg-rose-500/10"
                    onClick={() => {
                      void deleteSession(s.id);
                      setMenuId(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
