"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getScenarioById } from "@/lib/scenarios";
import { getStoredKeys } from "@/lib/keys";
import { AudioState } from "@/types";
import { useConversation } from "@/hooks/useConversation";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import ScenarioHeader from "@/components/ScenarioHeader";
import SceneIntro from "@/components/SceneIntro";
import ImmersiveDialogueView from "@/components/ImmersiveDialogueView";
import MicButton from "@/components/MicButton";
import StatusIndicator from "@/components/StatusIndicator";
import SessionSummary from "@/components/SessionSummary";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import OnboardingTooltip from "@/components/OnboardingTooltip";

type SessionPhase = "intro" | "conversation" | "complete";

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const scenarioId = params.scenarioId as string;
  const scenario = getScenarioById(scenarioId);

  // Session phase
  const [phase, setPhase] = useState<SessionPhase>("intro");

  // Text input (fallback alongside mic)
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);

  // Waveform analyser node (set when recording starts)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // Route guard
  useEffect(() => {
    if (!getStoredKeys()) router.push("/");
  }, [router]);

  // Hooks (called unconditionally)
  const fallbackScenario = scenario || {
    id: "", title: "", description: "", difficulty: "beginner" as const,
    icon: "", targetExchanges: 0, tutorRole: "", userRole: "",
    situation: "", openingLine: "", keyVocabulary: [], grammarFocus: "",
    completionTrigger: "",
  };

  const {
    messages, audioState, setAudioState, exchangeCount,
    isComplete, summaryText, error,
    initialize, sendUserMessage, handleRecordedAudio,
  } = useConversation(fallbackScenario);

  const { startRecording, stopRecording } = useAudioRecorder();

  // Keyboard support: space to hold
  const spaceDownRef = useRef(false);
  const startPromiseRef = useRef<Promise<AnalyserNode | null> | null>(null);
  const pendingStopRef = useRef(false);

  const stopAndProcessRecording = useCallback(async () => {
    try {
      const blob = await stopRecording();
      setAnalyserNode(null);
      await handleRecordedAudio(blob);
    } catch {
      setAudioState(AudioState.IDLE);
    }
  }, [stopRecording, handleRecordedAudio, setAudioState]);

  const handleMicDown = useCallback(async () => {
    if (audioState !== AudioState.IDLE) return;
    setAudioState(AudioState.RECORDING);

    const startPromise = startRecording();
    startPromiseRef.current = startPromise;

    try {
      const analyser = await startPromise;
      setAnalyserNode(analyser);
      startPromiseRef.current = null;

      // User released while microphone permission/start was still pending.
      if (pendingStopRef.current) {
        pendingStopRef.current = false;
        await stopAndProcessRecording();
      }
    } catch {
      startPromiseRef.current = null;
      pendingStopRef.current = false;
      setAudioState(AudioState.IDLE);
    }
  }, [audioState, startRecording, stopAndProcessRecording, setAudioState]);

  const handleMicUp = useCallback(async () => {
    // If recording start is still pending, stop immediately once start completes.
    if (startPromiseRef.current) {
      pendingStopRef.current = true;
      return;
    }
    await stopAndProcessRecording();
  }, [stopAndProcessRecording]);

  useEffect(() => {
    if (phase !== "conversation") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !spaceDownRef.current && !showTextInput && audioState === AudioState.IDLE) {
        e.preventDefault();
        spaceDownRef.current = true;
        handleMicDown();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space" && spaceDownRef.current) {
        e.preventDefault();
        spaceDownRef.current = false;
        handleMicUp();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [phase, showTextInput, audioState, handleMicDown, handleMicUp]);

  // Transition to complete phase when scenario ends
  useEffect(() => {
    if (isComplete && phase === "conversation") {
      const timer = setTimeout(() => setPhase("complete"), 1000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, phase]);

  // Dynamic page title
  useEffect(() => {
    if (scenario) {
      document.title = `${scenario.title} — SpeakFluid`;
    }
  }, [scenario]);

  if (!scenario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grey-50">
        <div className="text-center">
          <p className="text-grey-600 mb-4">Scenario not found.</p>
          <button onClick={() => router.push("/scenarios")} className="text-blue hover:underline">
            Back to scenarios
          </button>
        </div>
      </div>
    );
  }

  function handleBegin() {
    setPhase("conversation");
    initialize(true);
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!textInput.trim() || audioState !== AudioState.IDLE) return;
    sendUserMessage(textInput.trim(), false);
    setTextInput("");
  }

  // --- INTRO PHASE ---
  if (phase === "intro") {
    return <SceneIntro scenario={scenario} onBegin={handleBegin} />;
  }

  // --- CONVERSATION / COMPLETE PHASE ---
  return (
    <div className="flex flex-col h-screen bg-grey-100">
      <ScenarioHeader scenario={scenario} exchangeCount={exchangeCount} />

      {/* Message area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-[640px] mx-auto">
          <ImmersiveDialogueView messages={messages} scenario={scenario} />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="max-w-[640px] mx-auto px-4 pb-2">
          <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
        </div>
      )}

      {/* Bottom bar */}
      <div className="bg-white/80 backdrop-blur-xl border-t border-grey-200/60">
        <div
          className="max-w-[640px] mx-auto px-4 py-3 flex flex-col items-center gap-2"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          {/* Waveform — visible during recording */}
          <WaveformVisualizer
            analyser={analyserNode}
            isActive={audioState === AudioState.RECORDING}
          />

          {/* Text input or Mic button */}
          {showTextInput ? (
            <form onSubmit={handleTextSubmit} className="w-full flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type in Spanish..."
                disabled={audioState !== AudioState.IDLE}
                className="flex-1 h-11 px-4 rounded-xl border border-grey-200 bg-grey-50 text-grey-900 placeholder:text-grey-400 font-mono text-[0.9375rem] focus:border-blue focus:ring-1 focus:ring-blue/30 focus:bg-white transition-all disabled:opacity-50"
                autoFocus
              />
              <button
                type="submit"
                disabled={!textInput.trim() || audioState !== AudioState.IDLE}
                className="h-11 px-5 bg-blue text-white rounded-xl font-medium text-sm hover:bg-blue-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          ) : (
            <MicButton
              state={audioState}
              onPointerDown={handleMicDown}
              onPointerUp={handleMicUp}
            />
          )}

          {/* Status + toggle row */}
          <div className="flex items-center gap-3">
            <StatusIndicator state={audioState} />
            <span className="text-grey-200">|</span>
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className="text-[0.6875rem] text-grey-400 hover:text-blue transition-colors flex items-center gap-1.5 font-body"
            >
              {showTextInput ? (
                <>
                  <MicSmallIcon />
                  speak
                </>
              ) : (
                <>
                  <KeyboardIcon />
                  type
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* First-visit onboarding */}
      <OnboardingTooltip />

      {/* Completion overlay */}
      {isComplete && (
        <SessionSummary scenarioId={scenarioId} summaryText={summaryText} />
      )}
    </div>
  );
}

function KeyboardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="6" y1="8" x2="6" y2="8" />
      <line x1="10" y1="8" x2="10" y2="8" />
      <line x1="14" y1="8" x2="14" y2="8" />
      <line x1="18" y1="8" x2="18" y2="8" />
      <line x1="6" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="18" y2="12" />
      <line x1="8" y1="16" x2="16" y2="16" />
    </svg>
  );
}

function MicSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0014 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
