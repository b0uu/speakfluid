"use client";

import { useState, useCallback, useRef } from "react";
import type { Scenario, Message } from "@/types";
import { AudioState } from "@/types";
import { sendToTutor, parseTutorResponse } from "@/lib/tutor";
import { transcribeAudio } from "@/lib/stt";
import { synthesizeSpeech } from "@/lib/tts";
import { getStoredKeys } from "@/lib/keys";

export function useConversation(scenario: Scenario) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioState, setAudioState] = useState(AudioState.IDLE);
  const [isComplete, setIsComplete] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Ref to track messages without stale closure issues
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  // Audio element ref for TTS playback
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const exchangeCount = messages.filter((m) => m.role === "user").length;

  /** Add a tutor message from parsed response, return the full text for TTS. */
  function addTutorMessage(rawResponse: string) {
    const parsed = parseTutorResponse(rawResponse);

    const tutorMsg: Message = {
      id: crypto.randomUUID(),
      role: "tutor",
      type: parsed.type,
      timestamp: Date.now(),
      content: rawResponse,
      spanishText: parsed.spanishText,
      englishText: parsed.englishText,
      correctionExplanation: parsed.correctionExplanation,
      retryPrompt: parsed.retryPrompt,
      summaryText: parsed.summaryText,
      narratorText: parsed.narratorText,
    };

    const updated = [...messagesRef.current, tutorMsg];
    setMessages(updated);
    messagesRef.current = updated;

    if (parsed.type === "completion") {
      setIsComplete(true);
      setSummaryText(parsed.summaryText || "");
    }

    return parsed;
  }

  /** Play TTS for the given text. Resolves when done. */
  async function playTTS(text: string, apiKey: string): Promise<void> {
    const blobUrl = await synthesizeSpeech(text, apiKey);
    return new Promise((resolve, reject) => {
      const audio = new Audio(blobUrl);
      audioElRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(blobUrl);
        audioElRef.current = null;
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        audioElRef.current = null;
        reject(new Error("Audio playback failed."));
      };
      audio.play().catch((err) => {
        URL.revokeObjectURL(blobUrl);
        audioElRef.current = null;
        reject(err);
      });
    });
  }

  /** Initialize the conversation with the tutor's opening line + optional TTS. */
  const initialize = useCallback(
    async (withTTS = false) => {
      const opening: Message = {
        id: crypto.randomUUID(),
        role: "tutor",
        type: "normal",
        timestamp: Date.now(),
        content: scenario.openingLine,
        spanishText: scenario.openingLine,
      };
      setMessages([opening]);
      messagesRef.current = [opening];
      setIsComplete(false);
      setSummaryText("");
      setError(null);

      if (withTTS) {
        const keys = getStoredKeys();
        if (keys) {
          try {
            setAudioState(AudioState.SPEAKING);
            await playTTS(scenario.openingLine, keys.elevenlabs);
          } catch {
            // TTS failure for opening is non-critical
          } finally {
            setAudioState(AudioState.IDLE);
          }
        }
      }
    },
    [scenario]
  );

  /** Send a user message (text) and get the tutor's response. Optionally play TTS. */
  const sendUserMessage = useCallback(
    async (text: string, withTTS = false) => {
      if (audioState !== AudioState.IDLE || isComplete) return;

      const keys = getStoredKeys();
      if (!keys) {
        setError("API keys not found. Please return to the home page.");
        return;
      }

      setError(null);

      // Add user message
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        type: "user-input",
        timestamp: Date.now(),
        content: text,
      };

      const updatedMessages = [...messagesRef.current, userMsg];
      setMessages(updatedMessages);
      messagesRef.current = updatedMessages;

      // Call tutor
      setAudioState(AudioState.THINKING);

      try {
        const rawResponse = await sendToTutor(scenario, updatedMessages, keys.openai);
        const parsed = addTutorMessage(rawResponse);

        // Play TTS if requested (strip narrator text — it's visual only)
        if (withTTS && parsed.type !== "completion") {
          setAudioState(AudioState.SPEAKING);
          try {
            const ttsText = parsed.narratorText
              ? rawResponse.replace(/^\[NARRATOR\]\s*.+?\n/m, "").trim()
              : rawResponse;
            await playTTS(ttsText, keys.elevenlabs);
          } catch {
            // TTS failure is non-critical — text is already displayed
          }
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to get tutor response.";
        setError(msg);
      } finally {
        setAudioState(AudioState.IDLE);
      }
    },
    [audioState, isComplete, scenario]
  );

  /** Handle a recorded audio blob: transcribe → send to tutor → TTS response. */
  const handleRecordedAudio = useCallback(
    async (blob: Blob) => {
      if (isComplete) return;

      const keys = getStoredKeys();
      if (!keys) {
        setError("API keys not found. Please return to the home page.");
        setAudioState(AudioState.IDLE);
        return;
      }

      // Check for empty/too-short recording
      if (blob.size < 1000) {
        setError("No speech detected. Try holding the button longer.");
        setAudioState(AudioState.IDLE);
        return;
      }

      setError(null);
      setAudioState(AudioState.TRANSCRIBING);

      try {
        const transcription = await transcribeAudio(blob, keys.openai);

        if (!transcription.trim()) {
          setError("No speech detected. Please try again.");
          setAudioState(AudioState.IDLE);
          return;
        }

        // Add user message
        const userMsg: Message = {
          id: crypto.randomUUID(),
          role: "user",
          type: "user-input",
          timestamp: Date.now(),
          content: transcription,
        };

        const updatedMessages = [...messagesRef.current, userMsg];
        setMessages(updatedMessages);
        messagesRef.current = updatedMessages;

        // Call tutor
        setAudioState(AudioState.THINKING);
        const rawResponse = await sendToTutor(scenario, updatedMessages, keys.openai);
        const parsed = addTutorMessage(rawResponse);

        // Play TTS (strip narrator text — it's visual only)
        if (parsed.type !== "completion") {
          setAudioState(AudioState.SPEAKING);
          try {
            const ttsText = parsed.narratorText
              ? rawResponse.replace(/^\[NARRATOR\]\s*.+?\n/m, "").trim()
              : rawResponse;
            await playTTS(ttsText, keys.elevenlabs);
          } catch {
            // TTS failure is non-critical
          }
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setError(msg);
      } finally {
        setAudioState(AudioState.IDLE);
      }
    },
    [isComplete, scenario]
  );

  return {
    messages,
    audioState,
    setAudioState,
    exchangeCount,
    isComplete,
    summaryText,
    error,
    initialize,
    sendUserMessage,
    handleRecordedAudio,
  };
}
