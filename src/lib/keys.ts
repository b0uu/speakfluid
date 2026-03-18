import type { ApiKeys } from "@/types";

const OPENAI_KEY = "speakfluid-openai-key";
const ELEVENLABS_KEY = "speakfluid-elevenlabs-key";

export function getStoredKeys(): ApiKeys | null {
  if (typeof window === "undefined") return null;
  const openai = localStorage.getItem(OPENAI_KEY);
  const elevenlabs = localStorage.getItem(ELEVENLABS_KEY);
  if (!openai || !elevenlabs) return null;
  return { openai, elevenlabs };
}

export function storeKeys(keys: ApiKeys): void {
  localStorage.setItem(OPENAI_KEY, keys.openai);
  localStorage.setItem(ELEVENLABS_KEY, keys.elevenlabs);
}

export function clearStoredKeys(): void {
  localStorage.removeItem(OPENAI_KEY);
  localStorage.removeItem(ELEVENLABS_KEY);
}
