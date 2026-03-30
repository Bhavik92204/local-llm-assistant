"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAppShell } from "@/contexts/AppContext";
import {
  createChatSession,
  deleteChatSession,
  getChatSession,
  listChatSessions,
  patchChatSession,
  putChatSession,
  type ChatSessionSummary,
} from "@/lib/api";
import { chatMessageToRecord, recordsToMessages } from "@/lib/chatMessagesCodec";
import { deriveChatTitle } from "@/lib/chatTitle";
import type { ChatMessage } from "@/types";

const STORAGE_KEY = "jarvis_active_chat_id";
const DEBOUNCE_MS = 700;
const SEARCH_DEBOUNCE_MS = 350;

type ChatSessionContextValue = {
  activeSessionId: string | null;
  sessions: ChatSessionSummary[];
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  sessionTitle: string;
  setSessionTitle: (t: string) => void;
  isHydrated: boolean;
  listError: string | null;
  refreshSessions: () => Promise<void>;
  startNewChat: () => Promise<void>;
  openSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  togglePinSession: (id: string, pinned: boolean) => Promise<void>;
  duplicateSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  saveNow: () => Promise<void>;
  /** Persist this exact message list (use after local state updates before next render). */
  saveMessagesNow: (msgs: ChatMessage[]) => Promise<void>;
  exportActiveChat: () => void;
  setLastModelLabel: (model: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
};

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null);

export function ChatSessionProvider({ children }: { children: ReactNode }) {
  const { panel } = useAppShell();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionTitle, setSessionTitleState] = useState("New Chat");
  const [isHydrated, setIsHydrated] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const activeSessionIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const sessionTitleRef = useRef("New Chat");
  const lastModelRef = useRef("—");
  const saveDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  activeSessionIdRef.current = activeSessionId;
  messagesRef.current = messages;
  sessionTitleRef.current = sessionTitle;

  const refreshSessions = useCallback(async () => {
    try {
      setListError(null);
      const rows = await listChatSessions(searchDebounced || undefined);
      setSessions(rows);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Could not load chats");
    }
  }, [searchDebounced]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  const persistMessages = useCallback(
    async (msgs: ChatMessage[]) => {
      const id = activeSessionIdRef.current;
      if (!id || !isHydrated) return;
      const title = deriveChatTitle(msgs, sessionTitleRef.current);
      if (title !== sessionTitleRef.current) {
        sessionTitleRef.current = title;
        setSessionTitleState(title);
      }
      try {
        await putChatSession(id, {
          messages: msgs.map(chatMessageToRecord),
          title,
          metadata: { last_model: lastModelRef.current },
        });
        const rows = await listChatSessions(searchDebounced || undefined);
        setSessions(rows);
      } catch {
        /* offline or API error — avoid throwing */
      }
    },
    [isHydrated, searchDebounced],
  );

  const persist = useCallback(async () => {
    await persistMessages(messagesRef.current);
  }, [persistMessages]);

  const persistRef = useRef(persist);
  persistRef.current = persist;

  const flushSave = useCallback(async () => {
    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
      saveDebounceTimer.current = null;
    }
    await persistRef.current();
  }, []);

  const flushSaveRef = useRef(flushSave);
  flushSaveRef.current = flushSave;

  const scheduleSave = useCallback(() => {
    if (!isHydrated || !activeSessionIdRef.current) return;
    if (saveDebounceTimer.current) clearTimeout(saveDebounceTimer.current);
    saveDebounceTimer.current = setTimeout(() => {
      saveDebounceTimer.current = null;
      void persistRef.current();
    }, DEBOUNCE_MS);
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    scheduleSave();
    return () => {
      if (saveDebounceTimer.current) {
        clearTimeout(saveDebounceTimer.current);
        saveDebounceTimer.current = null;
      }
    };
  }, [messages, isHydrated, scheduleSave]);

  useEffect(() => {
    if (panel !== "chat") {
      void flushSaveRef.current();
    }
  }, [panel]);

  useEffect(() => {
    const onHidden = () => {
      void flushSaveRef.current();
    };
    const vis = () => {
      if (document.visibilityState === "hidden") onHidden();
    };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("pagehide", onHidden);
    window.addEventListener("beforeunload", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("pagehide", onHidden);
      window.removeEventListener("beforeunload", onHidden);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const full = await getChatSession(stored);
            if (cancelled) return;
            setActiveSessionId(full.id);
            sessionStorage.setItem(STORAGE_KEY, full.id);
            setMessages(recordsToMessages(full.messages));
            setSessionTitleState(full.title);
            sessionTitleRef.current = full.title;
            setIsHydrated(true);
            const rows = await listChatSessions();
            if (!cancelled) setSessions(rows);
            return;
          } catch {
            sessionStorage.removeItem(STORAGE_KEY);
          }
        }
        const created = await createChatSession();
        if (cancelled) return;
        setActiveSessionId(created.id);
        sessionStorage.setItem(STORAGE_KEY, created.id);
        setMessages([]);
        setSessionTitleState(created.title);
        sessionTitleRef.current = created.title;
        setIsHydrated(true);
        const rows = await listChatSessions();
        if (!cancelled) setSessions(rows);
      } catch (e) {
        if (!cancelled) {
          setListError(
            e instanceof Error ? e.message : "Chat sessions unavailable",
          );
          setIsHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSessionTitle = useCallback((t: string) => {
    setSessionTitleState(t);
    sessionTitleRef.current = t;
  }, []);

  const openSession = useCallback(
    async (id: string) => {
      if (id === activeSessionId) return;
      await flushSaveRef.current();
      try {
        const full = await getChatSession(id);
        setActiveSessionId(full.id);
        sessionStorage.setItem(STORAGE_KEY, full.id);
        setMessages(recordsToMessages(full.messages));
        setSessionTitleState(full.title);
        sessionTitleRef.current = full.title;
        await refreshSessions();
      } catch {
        setListError("Could not open conversation");
      }
    },
    [activeSessionId, refreshSessions],
  );

  const startNewChat = useCallback(async () => {
    await flushSaveRef.current();
    try {
      const created = await createChatSession();
      setActiveSessionId(created.id);
      sessionStorage.setItem(STORAGE_KEY, created.id);
      setMessages([]);
      setSessionTitleState(created.title);
      sessionTitleRef.current = created.title;
      await refreshSessions();
    } catch {
      setListError("Could not start a new chat");
    }
  }, [refreshSessions]);

  const deleteSession = useCallback(
    async (id: string) => {
      const ok = await deleteChatSession(id);
      if (!ok) {
        setListError("Could not delete conversation");
        return;
      }
      if (id === activeSessionId) {
        sessionStorage.removeItem(STORAGE_KEY);
        try {
          const created = await createChatSession();
          setActiveSessionId(created.id);
          sessionStorage.setItem(STORAGE_KEY, created.id);
          setMessages([]);
          setSessionTitleState(created.title);
          sessionTitleRef.current = created.title;
        } catch {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
      await refreshSessions();
    },
    [activeSessionId, refreshSessions],
  );

  const togglePinSession = useCallback(
    async (id: string, pinned: boolean) => {
      try {
        await patchChatSession(id, { pinned });
        await refreshSessions();
      } catch {
        setListError("Could not update pin");
      }
    },
    [refreshSessions],
  );

  const duplicateSession = useCallback(
    async (id: string) => {
      try {
        await flushSaveRef.current();
        const copy = await createChatSession({ duplicate_from: id });
        setActiveSessionId(copy.id);
        sessionStorage.setItem(STORAGE_KEY, copy.id);
        setMessages(recordsToMessages(copy.messages));
        setSessionTitleState(copy.title);
        sessionTitleRef.current = copy.title;
        await refreshSessions();
      } catch {
        setListError("Could not duplicate conversation");
      }
    },
    [refreshSessions],
  );

  const renameSession = useCallback(
    async (id: string, title: string) => {
      const t = title.trim() || "New Chat";
      try {
        await patchChatSession(id, { title: t });
        if (id === activeSessionId) {
          setSessionTitleState(t);
          sessionTitleRef.current = t;
        }
        await refreshSessions();
      } catch {
        setListError("Could not rename");
      }
    },
    [activeSessionId, refreshSessions],
  );

  const exportActiveChat = useCallback(() => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chat-${activeSessionId ?? "export"}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [messages, activeSessionId]);

  const setLastModelLabel = useCallback((model: string) => {
    lastModelRef.current = model || "—";
  }, []);

  const saveNow = useCallback(async () => {
    await flushSaveRef.current();
  }, []);

  const saveMessagesNow = useCallback(
    async (msgs: ChatMessage[]) => {
      if (saveDebounceTimer.current) {
        clearTimeout(saveDebounceTimer.current);
        saveDebounceTimer.current = null;
      }
      await persistMessages(msgs);
    },
    [persistMessages],
  );

  const value = useMemo(
    () => ({
      activeSessionId,
      sessions,
      messages,
      setMessages,
      sessionTitle,
      setSessionTitle,
      isHydrated,
      listError,
      refreshSessions,
      startNewChat,
      openSession,
      deleteSession,
      togglePinSession,
      duplicateSession,
      renameSession,
      saveNow,
      saveMessagesNow,
      exportActiveChat,
      setLastModelLabel,
      searchQuery,
      setSearchQuery,
    }),
    [
      activeSessionId,
      sessions,
      messages,
      sessionTitle,
      isHydrated,
      listError,
      refreshSessions,
      startNewChat,
      openSession,
      deleteSession,
      togglePinSession,
      duplicateSession,
      renameSession,
      saveNow,
      saveMessagesNow,
      exportActiveChat,
      setLastModelLabel,
      searchQuery,
    ],
  );

  return (
    <ChatSessionContext.Provider value={value}>{children}</ChatSessionContext.Provider>
  );
}

export function useChatSession() {
  const ctx = useContext(ChatSessionContext);
  if (!ctx) {
    throw new Error("useChatSession must be used within ChatSessionProvider");
  }
  return ctx;
}
