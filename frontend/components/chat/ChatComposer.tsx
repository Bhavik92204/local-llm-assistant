"use client";

type Props = {
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  voiceEnabled: boolean;
  voiceListening: boolean;
  onMic: () => void;
};

export function ChatComposer({
  input,
  onInputChange,
  onSend,
  voiceEnabled,
  voiceListening,
  onMic,
}: Props) {
  return (
    <footer className="shrink-0 border-t border-jarvis-border/80 bg-jarvis-surface/55 p-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl gap-2">
        {voiceEnabled && (
          <button
            type="button"
            onClick={onMic}
            disabled={voiceListening}
            title="Microphone (browser Web Speech API — not sent to this server)"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-jarvis-border bg-jarvis-bg text-jarvis-muted transition hover:border-jarvis-accent/40 hover:text-jarvis-text disabled:opacity-40"
          >
            <span className="text-[10px] font-mono uppercase tracking-wide">
              {voiceListening ? "…" : "Mic"}
            </span>
          </button>
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Message…"
          className="min-h-11 flex-1 rounded-xl border border-jarvis-border bg-jarvis-bg px-4 text-sm text-jarvis-text placeholder:text-jarvis-muted/50 outline-none transition focus:border-jarvis-accent/45 focus:ring-2 focus:ring-jarvis-accent/15"
          aria-label="Message input"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!input.trim()}
          className="rounded-xl bg-jarvis-accent px-5 py-2 text-sm font-medium text-jarvis-bg transition hover:bg-jarvis-accentDim disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </footer>
  );
}
