"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  fetchSettings,
  saveSettings,
  testOllamaConnection,
  type SettingsPayload,
} from "@/lib/api";

export function SettingsPanel() {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [memory, setMemory] = useState(true);
  const [voice, setVoice] = useState(false);
  const [tools, setTools] = useState(true);
  const [intervalSec, setIntervalSec] = useState(8);
  const [allowed, setAllowed] = useState("notepad, calculator");
  const [personalityPreset, setPersonalityPreset] = useState("jarvis_default");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const presetOptions = useMemo(() => {
    const fromApi = data?.personality_preset_keys?.length
      ? data.personality_preset_keys
      : ["jarvis_default", "minimal"];
    if (!fromApi.includes(personalityPreset)) {
      return [personalityPreset, ...fromApi];
    }
    return fromApi;
  }, [data?.personality_preset_keys, personalityPreset]);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const s = await fetchSettings();
      setData(s);
      setBaseUrl(s.file.ollama_base_url || s.env_fallback.ollama_base_url || "");
      setModel(s.file.ollama_model || s.env_fallback.ollama_model || "");
      setMemory(s.file.memory_enabled);
      setVoice(s.file.voice_enabled);
      setTools(s.file.tools_enabled);
      setIntervalSec(s.file.system_metrics_interval_sec);
      setAllowed(s.file.allowed_applications.join(", "));
      const effKey =
        typeof s.effective.assistant_personality === "string"
          ? s.effective.assistant_personality
          : "jarvis_default";
      setPersonalityPreset(effKey);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setMsg(null);
    setErr(null);
    const apps = allowed
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    try {
      const next = await saveSettings({
        ollama_base_url: baseUrl.trim(),
        ollama_model: model.trim(),
        memory_enabled: memory,
        voice_enabled: voice,
        tools_enabled: tools,
        system_metrics_interval_sec: intervalSec,
        allowed_applications: apps,
        personality_preset: personalityPreset,
      });
      setData(next);
      setMsg("Saved. Running services pick up Ollama URL/model on next request.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function onTest() {
    setTestResult(null);
    setErr(null);
    try {
      await onSave();
      const t = await testOllamaConnection();
      setTestResult(
        `${t.ok ? "OK" : "Fail"}: ${t.message} · models: ${t.models.slice(0, 6).join(", ")}${t.models.length > 6 ? "…" : ""}`,
      );
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : "Test failed");
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-jarvis-border/80 px-6 py-4">
        <h2 className="text-sm font-semibold">Settings</h2>
        <p className="text-xs text-jarvis-muted">
          Persisted in <span className="font-mono">backend/data/settings.json</span>
          . Empty URL/model falls back to environment defaults.
        </p>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-xl space-y-5"
        >
          {err && <p className="text-sm text-rose-400/90">{err}</p>}
          {msg && <p className="text-sm text-emerald-400/90">{msg}</p>}
          {testResult && (
            <p className="rounded-lg border border-jarvis-border bg-jarvis-bg/60 p-2 font-mono text-xs text-jarvis-muted">
              {testResult}
            </p>
          )}

          <label className="block text-xs text-jarvis-muted">
            Ollama base URL
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={data?.env_fallback.ollama_base_url || "http://127.0.0.1:11434"}
              className="mt-1 w-full rounded-lg border border-jarvis-border bg-jarvis-bg px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="block text-xs text-jarvis-muted">
            Model name
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={data?.env_fallback.ollama_model || "llama3"}
              className="mt-1 w-full rounded-lg border border-jarvis-border bg-jarvis-bg px-3 py-2 font-mono text-sm"
            />
          </label>

          <label className="block text-xs text-jarvis-muted">
            Assistant personality preset
            <select
              value={personalityPreset}
              onChange={(e) => setPersonalityPreset(e.target.value)}
              className="mt-1 w-full rounded-lg border border-jarvis-border bg-jarvis-bg px-3 py-2 text-sm"
            >
              {presetOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-jarvis-muted/90">
              Env default when unset in file:{" "}
              <span className="font-mono">
                {data?.env_fallback.assistant_personality ?? "jarvis_default"}
              </span>
              . Edit prompt text in backend{" "}
              <span className="font-mono">app/config/personality.py</span>.
            </span>
          </label>

          <div className="space-y-2 rounded-xl border border-jarvis-border/80 bg-jarvis-surface/25 p-4">
            {[
              ["Memory enabled", memory, setMemory] as const,
              ["Voice enabled (client STT/TTS)", voice, setVoice] as const,
              ["Tools enabled", tools, setTools] as const,
            ].map(([label, val, set]) => (
              <label
                key={label}
                className="flex items-center justify-between gap-4 text-sm text-jarvis-text"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={val}
                  onChange={(e) => set(e.target.checked)}
                  className="h-4 w-4 accent-jarvis-accent"
                />
              </label>
            ))}
          </div>

          <label className="block text-xs text-jarvis-muted">
            System dashboard refresh (seconds)
            <input
              type="number"
              min={2}
              max={120}
              value={intervalSec}
              onChange={(e) => setIntervalSec(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-jarvis-border bg-jarvis-bg px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-xs text-jarvis-muted">
            Allowed application IDs (comma-separated, for{" "}
            <span className="font-mono">open_allowed_application</span>)
            <input
              value={allowed}
              onChange={(e) => setAllowed(e.target.value)}
              className="mt-1 w-full rounded-lg border border-jarvis-border bg-jarvis-bg px-3 py-2 font-mono text-sm"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onSave()}
              className="rounded-lg bg-jarvis-accent px-4 py-2 text-sm font-medium text-jarvis-bg"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => void onTest()}
              className="rounded-lg border border-jarvis-border px-4 py-2 text-sm text-jarvis-text"
            >
              Test Ollama connection
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-jarvis-border px-4 py-2 text-sm text-jarvis-muted"
            >
              Reload
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
