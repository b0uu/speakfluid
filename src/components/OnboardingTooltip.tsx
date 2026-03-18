"use client";

import { useEffect, useState } from "react";

const ONBOARDED_KEY = "speakfluid-onboarded";

export default function OnboardingTooltip() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDED_KEY)) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem(ONBOARDED_KEY, "true");
    setShow(false);
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/20 flex items-end justify-center pb-40 px-4 animate-fade-in-up">
      <div className="bg-white rounded-lg shadow-elevated px-5 py-4 max-w-sm text-center">
        <p className="text-sm text-grey-900 leading-relaxed mb-3">
          <strong>Hold the microphone button</strong> to speak. Release when you&apos;re done.
          <br />
          You can also switch to typing with the keyboard toggle below.
        </p>
        <button
          onClick={dismiss}
          className="px-4 py-2 bg-blue text-white text-sm font-medium rounded-lg hover:bg-blue-light transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
