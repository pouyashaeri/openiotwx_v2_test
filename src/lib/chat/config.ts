import type { ChatConfig } from "./llm.ts";

const KEY = "openiotwx-chat-config-v1";

// A model running on the user's own computer through Ollama. Change these in the chat panel's
// settings, or set VITE_CHAT_ENDPOINT / VITE_CHAT_MODEL at build time to point at a server later.
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const DEFAULT_CONFIG: ChatConfig = {
  endpoint: env.VITE_CHAT_ENDPOINT || "http://localhost:11434/v1",
  model: env.VITE_CHAT_MODEL || "qwen2.5:3b",
  apiKey: "",
};

export function loadConfig(): ChatConfig {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CONFIG;
    const saved = JSON.parse(raw) as Partial<ChatConfig>;
    return {
      endpoint: (saved.endpoint || DEFAULT_CONFIG.endpoint).replace(/\/+$/, ""),
      model: saved.model || DEFAULT_CONFIG.model,
      apiKey: saved.apiKey ?? "",
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: ChatConfig): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    // Private windows can refuse storage. The settings then last for this visit only.
  }
}
