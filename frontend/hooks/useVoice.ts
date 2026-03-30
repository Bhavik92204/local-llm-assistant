"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Web Speech API (Chrome/Edge). Isolated for future swap to server STT.
 */
export function useVoice(enabled: boolean) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => {
        start: () => void;
        stop: () => void;
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((ev: unknown) => void) | null;
        onerror: ((ev: { error?: string }) => void) | null;
        onend: (() => void) | null;
      };
      webkitSpeechRecognition?: new () => {
        start: () => void;
        stop: () => void;
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((ev: unknown) => void) | null;
        onerror: ((ev: { error?: string }) => void) | null;
        onend: (() => void) | null;
      };
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(Boolean(SR && enabled));
  }, [enabled]);

  const startListening = useCallback(
    (onResult: (text: string) => void, onError?: (msg: string) => void) => {
      if (!enabled || typeof window === "undefined") return;
      const w = window as unknown as {
        SpeechRecognition?: new () => {
          start: () => void;
          stop: () => void;
          continuous: boolean;
          interimResults: boolean;
          lang: string;
          onresult: ((ev: unknown) => void) | null;
          onerror: ((ev: { error?: string }) => void) | null;
          onend: (() => void) | null;
        };
        webkitSpeechRecognition?: new () => {
          start: () => void;
          stop: () => void;
          continuous: boolean;
          interimResults: boolean;
          lang: string;
          onresult: ((ev: unknown) => void) | null;
          onerror: ((ev: { error?: string }) => void) | null;
          onend: (() => void) | null;
        };
      };
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!SR) {
        onError?.("Speech recognition is not supported in this browser.");
        return;
      }
      try {
        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";
        rec.onresult = (ev: unknown) => {
          const e = ev as {
            results: Array<Array<{ transcript: string }>>;
          };
          const text = e.results[0][0].transcript?.trim() ?? "";
          setListening(false);
          if (text) onResult(text);
        };
        rec.onerror = (ev) => {
          setListening(false);
          onError?.(ev.error || "speech error");
        };
        rec.onend = () => setListening(false);
        recRef.current = rec;
        setListening(true);
        rec.start();
      } catch (e) {
        setListening(false);
        onError?.(e instanceof Error ? e.message : "Could not start microphone");
      }
    },
    [enabled],
  );

  const stopListening = useCallback(() => {
    try {
      recRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !enabled) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1;
        window.speechSynthesis.speak(u);
      } catch {
        /* ignore */
      }
    },
    [enabled],
  );

  return { supported, listening, startListening, stopListening, speak };
}
