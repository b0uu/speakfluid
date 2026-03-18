import { AudioState } from "@/types";

const stateConfig: Record<AudioState, { label: string; color: string }> = {
  [AudioState.IDLE]: { label: "Ready", color: "text-blue" },
  [AudioState.RECORDING]: { label: "Listening...", color: "text-blue" },
  [AudioState.TRANSCRIBING]: { label: "Transcribing...", color: "text-grey-600" },
  [AudioState.THINKING]: { label: "Thinking...", color: "text-grey-600" },
  [AudioState.SPEAKING]: { label: "Speaking...", color: "text-blue-light" },
};

export default function StatusIndicator({ state }: { state: AudioState }) {
  const { label, color } = stateConfig[state];

  return (
    <p
      className={`text-xs font-medium uppercase tracking-wider transition-colors duration-150 ${color}`}
      role="status"
      aria-live="polite"
    >
      {label}
    </p>
  );
}
