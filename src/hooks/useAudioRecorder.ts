"use client";

import { useRef, useCallback, useState, useEffect } from "react";

export function useAudioRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const cleanupMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {
        // Ignore close errors.
      });
      audioCtxRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<AnalyserNode | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up analyser for waveform visualization
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Prefer webm/opus, fallback to whatever is available
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      setIsRecording(true);
      return analyser;
    } catch (err) {
      throw new Error(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied. Please allow microphone access in your browser settings."
          : "Failed to start recording."
      );
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        reject(new Error("No active recording."));
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        cleanupMedia();
        resolve(blob);
      };

      recorder.stop();
    });
  }, [cleanupMedia]);

  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, [cleanupMedia]);

  return {
    isRecording,
    analyser: analyserRef.current,
    startRecording,
    stopRecording,
  };
}
