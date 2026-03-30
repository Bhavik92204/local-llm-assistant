"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatBanner } from "@/components/chat/ChatBanner";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatEmptyState } from "@/components/chat/ChatEmptyState";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { useAppShell } from "@/contexts/AppContext";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { useVoice } from "@/hooks/useVoice";
import {
  fetchSettings,
  fetchStatus,
  sendChat,
  type ChatMessagePayload,
} from "@/lib/api";
import type { ChatMessage, ToolEvent } from "@/types";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ChatPanel() {
  const { panel, setPhase, setActiveToolLabel } = useAppShell();
  const {
    messages,
    setMessages,
    sessionTitle,
    isHydrated,
    exportActiveChat,
    setLastModelLabel,
    saveMessagesNow,
    startNewChat,
  } = useChatSession();
  const [input, setInput] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [modelLabel, setModelLabel] = useState("—");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const voice = useVoice(voiceEnabled);

  const refreshConnection = useCallback(async () => {
    try {
      const st = await fetchStatus();
      setBackendOk(true);
      setOllamaOk(st.ollama_reachable);
      setModelLabel(st.configured_model);
    } catch {
      setBackendOk(false);
      setOllamaOk(null);
    }
  }, []);

  const refreshVoiceSetting = useCallback(() => {
    fetchSettings()
      .then((s) => setVoiceEnabled(s.file.voice_enabled))
      .catch(() => setVoiceEnabled(false));
  }, []);

  useEffect(() => {
    setLastModelLabel(modelLabel);
  }, [modelLabel, setLastModelLabel]);

  useEffect(() => {
    refreshConnection();
    const id = setInterval(refreshConnection, 12_000);
    return () => clearInterval(id);
  }, [refreshConnection]);

  useEffect(() => {
    refreshVoiceSetting();
  }, [refreshVoiceSetting, panel]);

  useEffect(() => {
    const onFocus = () => refreshVoiceSetting();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshVoiceSetting]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, banner]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setBanner(null);
    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    const afterUser = [...messages, userMsg];
    setMessages(afterUser);
    await saveMessagesNow(afterUser);
    setPhase("thinking");
    setActiveToolLabel(null);

    const history: ChatMessagePayload[] = afterUser.map((x) => ({
      role: x.role,
      content: x.content,
    }));

    try {
      const reply = await sendChat(history);
      const toolEvents = (reply.tool_events ?? []) as ToolEvent[];
      if (toolEvents.length) {
        setPhase("tool_active");
        setActiveToolLabel(
          toolEvents.map((t) => `${t.tool}${t.ok ? "" : " ✕"}`).join(" · "),
        );
        window.setTimeout(() => {
          setActiveToolLabel(null);
          setPhase("ready");
        }, 900);
      } else {
        setPhase("ready");
      }

      const assistantMsg: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: reply.message || "(No response)",
        createdAt: Date.now(),
        toolEvents: toolEvents.length ? toolEvents : undefined,
        memoryUsed: reply.memory_used,
      };
      const afterAll = [...afterUser, assistantMsg];
      setMessages(afterAll);
      await saveMessagesNow(afterAll);

      if (voiceEnabled && voice.supported) {
        setPhase("speaking");
        voice.speak(assistantMsg.content.slice(0, 4000));
        window.setTimeout(() => setPhase("ready"), 1200);
      }
    } catch (e) {
      setPhase("error");
      const msg = e instanceof Error ? e.message : "Request failed";
      setBanner(msg);
      const errMsg: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: `The assistant could not complete this request. ${msg}`,
        createdAt: Date.now(),
      };
      const afterErr = [...afterUser, errMsg];
      setMessages(afterErr);
      await saveMessagesNow(afterErr);
      window.setTimeout(() => setPhase("ready"), 2000);
    }
  }

  function copyText(t: string) {
    void navigator.clipboard.writeText(t);
  }

  const mic = () => {
    if (!voiceEnabled) return;
    setPhase("listening");
    voice.startListening(
      (t) => {
        setInput((prev) => (prev ? `${prev} ${t}` : t));
        setPhase("ready");
      },
      () => setPhase("ready"),
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader
        modelLabel={modelLabel}
        sessionTitle={sessionTitle}
        backendOk={backendOk}
        ollamaOk={ollamaOk}
        onNewChat={() => void startNewChat()}
        onExport={exportActiveChat}
        onShowHealth={setBanner}
      />
      <ChatBanner message={banner} onDismiss={() => setBanner(null)} />

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {!isHydrated && (
            <p className="text-center text-sm text-jarvis-muted">Restoring conversation…</p>
          )}
          {isHydrated && messages.length === 0 && <ChatEmptyState />}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onCopy={copyText} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <ChatComposer
        input={input}
        onInputChange={setInput}
        onSend={() => void handleSend()}
        voiceEnabled={voiceEnabled}
        voiceListening={voice.listening}
        onMic={mic}
      />
    </div>
  );
}