"use client";

import { AudioState } from "@/types";

interface MicButtonProps {
  state: AudioState;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
}

export default function MicButton({ state, onPointerDown, onPointerUp }: MicButtonProps) {
  const isIdle = state === AudioState.IDLE;
  const isRecording = state === AudioState.RECORDING;
  const isSpeaking = state === AudioState.SPEAKING;
  const isProcessing =
    state === AudioState.TRANSCRIBING || state === AudioState.THINKING;

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulsing rings during recording */}
      {isRecording && (
        <>
          <span className="absolute w-16 h-16 rounded-full bg-blue animate-pulse-ring" />
          <span className="absolute w-16 h-16 rounded-full bg-blue animate-pulse-ring [animation-delay:0.5s]" />
          <span className="absolute w-16 h-16 rounded-full bg-blue animate-pulse-ring [animation-delay:1s]" />
        </>
      )}

      <button
        onPointerDown={isIdle ? onPointerDown : undefined}
        onPointerUp={isRecording ? onPointerUp : undefined}
        onPointerLeave={isRecording ? onPointerUp : undefined}
        disabled={!isIdle && !isRecording}
        aria-label={
          isIdle
            ? "Hold to speak"
            : isRecording
            ? "Release to send"
            : isSpeaking
            ? "Tutor is speaking"
            : "Processing"
        }
        className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 touch-none select-none ${
          isIdle
            ? "border-2 border-blue text-blue hover:bg-blue-50 cursor-pointer"
            : isRecording
            ? "bg-blue text-white scale-110 cursor-pointer"
            : isSpeaking
            ? "bg-blue-light text-white cursor-default opacity-70"
            : "bg-grey-200 text-grey-600 cursor-default"
        }`}
      >
        {isRecording ? (
          <MicIcon />
        ) : isProcessing ? (
          state === AudioState.TRANSCRIBING ? (
            <SpinnerIcon />
          ) : (
            <ThinkingDots />
          )
        ) : isSpeaking ? (
          <SpeakerIcon />
        ) : (
          <MicIcon />
        )}
      </button>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0014 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ThinkingDots() {
  return (
    <div className="flex gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce-dot" />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce-dot [animation-delay:0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce-dot [animation-delay:0.3s]" />
    </div>
  );
}

function SpeakerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  );
}
