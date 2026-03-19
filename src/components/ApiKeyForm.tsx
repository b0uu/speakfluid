"use client";

import { useState } from "react";

interface ApiKeyFormProps {
  onSubmit: (openaiKey: string, elevenlabsKey: string) => void;
  loading?: boolean;
  error?: string | null;
}

export default function ApiKeyForm({ onSubmit, loading, error }: ApiKeyFormProps) {
  const [openaiKey, setOpenaiKey] = useState("");
  const [elevenlabsKey, setElevenlabsKey] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!openaiKey.trim() || !elevenlabsKey.trim()) return;
    onSubmit(openaiKey.trim(), elevenlabsKey.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="openai-key" className="block text-sm font-medium text-grey-900 mb-1.5">
          OpenAI API Key
        </label>
        <input
          id="openai-key"
          type="password"
          placeholder="sk-..."
          value={openaiKey}
          onChange={(e) => setOpenaiKey(e.target.value)}
          className="w-full h-12 px-4 rounded-md border border-grey-200 bg-white text-grey-900 placeholder:text-grey-400 focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
          autoComplete="off"
        />
        <p className="mt-1 text-xs text-grey-600">
          Used for speech recognition and tutor conversation.
        </p>
      </div>

      <div>
        <label htmlFor="elevenlabs-key" className="block text-sm font-medium text-grey-900 mb-1.5">
          ElevenLabs API Key
        </label>
        <input
          id="elevenlabs-key"
          type="password"
          placeholder="xi-..."
          value={elevenlabsKey}
          onChange={(e) => setElevenlabsKey(e.target.value)}
          className="w-full h-12 px-4 rounded-md border border-grey-200 bg-white text-grey-900 placeholder:text-grey-400 focus:border-blue focus:ring-1 focus:ring-blue transition-colors"
          autoComplete="off"
        />
        <p className="mt-1 text-xs text-grey-600">
          Used for tutor voice synthesis.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !openaiKey.trim() || !elevenlabsKey.trim()}
        className="w-full h-12 bg-blue text-white font-medium rounded-lg hover:bg-blue-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Validating..." : "Start Practicing"}
      </button>

      <p className="text-xs text-grey-600 text-center leading-relaxed">
        Your keys stay in your browser and are sent directly to OpenAI and ElevenLabs, not to any SpeakFluid backend.
      </p>
    </form>
  );
}
