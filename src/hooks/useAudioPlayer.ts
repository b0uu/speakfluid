"use client";

import { useRef, useCallback } from "react";

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /** Play audio from a blob URL. Resolves when playback finishes. */
  const playAudio = useCallback((blobUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Stop any existing playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(blobUrl);
        audioRef.current = null;
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        audioRef.current = null;
        reject(new Error("Audio playback failed."));
      };

      audio.play().catch((err) => {
        URL.revokeObjectURL(blobUrl);
        audioRef.current = null;
        reject(err);
      });
    });
  }, []);

  /** Stop current playback. */
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  return { playAudio, stopPlayback };
}
