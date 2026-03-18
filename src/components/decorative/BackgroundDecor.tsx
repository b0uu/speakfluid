"use client";

import {
  SpeechBubbleIcon,
  SoundWaveIcon,
  OpenBookIcon,
  ConversationIcon,
} from "./CulturalIcons";

/** Floating decorative background icons — visible only on desktop (lg+). */
export default function BackgroundDecor() {
  return (
    <div className="hidden lg:block pointer-events-none select-none" aria-hidden="true">
      <SpeechBubbleIcon
        className="absolute top-24 left-[8%] w-16 h-16 text-deco opacity-[0.14] animate-float"
      />
      <SoundWaveIcon
        className="absolute top-40 right-[10%] w-14 h-14 text-deco opacity-[0.12] animate-float-slow"
      />
      <OpenBookIcon
        className="absolute bottom-32 left-[12%] w-16 h-16 text-deco opacity-[0.10] animate-float-slow"
      />
      <ConversationIcon
        className="absolute top-[60%] right-[6%] w-14 h-14 text-deco opacity-[0.12] animate-float"
      />
    </div>
  );
}
