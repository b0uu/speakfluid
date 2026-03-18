"use client";

import { useCallback } from "react";
import { synthesizeSpeech } from "@/lib/tts";
import { useAudioPlayer } from "./useAudioPlayer";

export function useTTS() {
  const { playAudio, stopPlayback } = useAudioPlayer();

  /** Synthesize and play speech. Resolves when playback ends. */
  const speak = useCallback(
    async (text: string, apiKey: string): Promise<void> => {
      const blobUrl = await synthesizeSpeech(text, apiKey);
      await playAudio(blobUrl);
    },
    [playAudio]
  );

  return { speak, stopPlayback };
}
