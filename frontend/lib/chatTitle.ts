import type { ChatMessage } from "@/types";

const PLACEHOLDER_TITLE = /^(New Chat|Chat ·)/;

/**
 * Auto title from first user message when title is still a placeholder.
 */
export function deriveChatTitle(messages: ChatMessage[], currentTitle: string): string {
  const firstUser = messages.find((m) => m.role === "user")?.content?.trim();
  if (firstUser) {
    const oneLine = firstUser.replace(/\s+/g, " ");
    const short =
      oneLine.length > 56 ? `${oneLine.slice(0, 53).trim()}...` : oneLine;
    if (PLACEHOLDER_TITLE.test(currentTitle.trim())) {
      return short;
    }
  }
  if (!messages.length) {
    return currentTitle.trim() || "New Chat";
  }
  if (currentTitle.trim()) return currentTitle.trim();
  return `Chat · ${new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
