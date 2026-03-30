"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, ToolEvent } from "@/types";

function ToolChips({ events }: { events: ToolEvent[] }) {
  if (!events.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/5 pt-2">
      {events.map((e) => (
        <span
          key={`${e.tool}-${e.ok}`}
          className={`rounded-md px-2 py-0.5 font-mono text-[10px] ${
            e.ok
              ? "bg-emerald-500/15 text-emerald-200/90 ring-1 ring-emerald-500/25"
              : "bg-rose-500/15 text-rose-200/90 ring-1 ring-rose-500/25"
          }`}
        >
          {e.tool}
          {e.detail ? ` · ${e.detail}` : ""}
        </span>
      ))}
    </div>
  );
}

export function MessageBubble({
  message,
  onCopy,
}: {
  message: ChatMessage;
  onCopy: (text: string) => void;
}) {
  const isUser = message.role === "user";
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`group relative max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 shadow-lg ring-1 transition ${
          isUser
            ? "bg-jarvis-accent/[0.12] ring-jarvis-accent/25"
            : "bg-jarvis-border/40 ring-jarvis-border/80"
        }`}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-jarvis-muted">
            {isUser ? "You" : "Assistant"}
          </span>
          <span className="font-mono text-[10px] text-jarvis-muted/70">
            {time}
          </span>
        </div>
        {isUser ? (
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-jarvis-text">
            {message.content}
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-2 prose-pre:bg-jarvis-bg prose-pre:ring-1 prose-pre:ring-jarvis-border">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {message.toolEvents && message.toolEvents.length > 0 && (
          <ToolChips events={message.toolEvents} />
        )}
        {message.memoryUsed && (
          <p className="mt-2 font-mono text-[10px] text-jarvis-muted">
            Local memory context was included for this reply.
          </p>
        )}
        <button
          type="button"
          onClick={() => onCopy(message.content)}
          className="absolute right-2 top-2 rounded-md px-2 py-0.5 font-mono text-[10px] text-jarvis-muted opacity-0 transition hover:bg-jarvis-bg/80 hover:text-jarvis-text group-hover:opacity-100"
        >
          Copy
        </button>
      </div>
    </motion.div>
  );
}
