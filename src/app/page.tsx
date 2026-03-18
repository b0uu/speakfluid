"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ApiKeyForm from "@/components/ApiKeyForm";
import BackgroundDecor from "@/components/decorative/BackgroundDecor";
import { getStoredKeys, storeKeys, clearStoredKeys } from "@/lib/keys";
import { validateOpenAIKey } from "@/lib/openai";
import { validateElevenLabsKey } from "@/lib/elevenlabs";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKeys, setHasKeys] = useState(false);

  useEffect(() => {
    if (getStoredKeys()) setHasKeys(true);
  }, []);

  async function handleSubmit(openaiKey: string, elevenlabsKey: string) {
    setLoading(true);
    setError(null);

    const [openaiValid, elevenValid] = await Promise.all([
      validateOpenAIKey(openaiKey),
      validateElevenLabsKey(elevenlabsKey),
    ]);

    if (!openaiValid && !elevenValid) {
      setError("Both API keys are invalid. Please check and try again.");
      setLoading(false);
      return;
    }
    if (!openaiValid) {
      setError("OpenAI API key is invalid. Please check and try again.");
      setLoading(false);
      return;
    }
    if (!elevenValid) {
      setError("ElevenLabs API key is invalid. Please check and try again.");
      setLoading(false);
      return;
    }

    storeKeys({ openai: openaiKey, elevenlabs: elevenlabsKey });
    router.push("/scenarios");
  }

  return (
    <div className="relative min-h-screen bg-grey-100 overflow-hidden">
      <BackgroundDecor />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 lg:gap-20 items-center min-h-[calc(100vh-12rem)]">
          {/* Left column — editorial headline */}
          <div>
            <p className="text-sm font-medium tracking-wider uppercase text-blue mb-4">
              Conversational Spanish Practice
            </p>
            <h1 className="font-display text-[2.5rem] lg:text-[4rem] leading-[1.1] tracking-[-0.02em] text-grey-900">
              Your Spanish<br />
              starts with<br />
              <span className="text-blue">speaking.</span>
            </h1>
            <p className="mt-6 text-lg text-grey-600 max-w-md leading-relaxed">
              Guided voice conversations with an AI tutor. Pick a scenario,
              hold the mic, and practice real dialogue — with corrections,
              not lectures.
            </p>
          </div>

          {/* Right column — form card */}
          <div className="w-full max-w-md lg:max-w-none">
            <div className="bg-white rounded-lg shadow-card p-8">
              {hasKeys ? (
                <div className="text-center space-y-4">
                  <p className="text-grey-900 font-medium">Welcome back.</p>
                  <button
                    onClick={() => router.push("/scenarios")}
                    className="w-full h-12 bg-blue text-white font-medium rounded-lg hover:bg-blue-light transition-colors"
                  >
                    Continue to Scenarios
                  </button>
                  <button
                    onClick={() => {
                      setHasKeys(false);
                      clearStoredKeys();
                    }}
                    className="text-sm text-grey-600 hover:text-grey-900 transition-colors"
                  >
                    Change API keys
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-xl text-grey-900 mb-1">
                    Get started
                  </h2>
                  <p className="text-sm text-grey-600 mb-6">
                    Enter your API keys to begin.
                  </p>
                  <ApiKeyForm
                    onSubmit={handleSubmit}
                    loading={loading}
                    error={error}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
