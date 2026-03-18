"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ScenarioGrid from "@/components/ScenarioGrid";
import { getStoredKeys, clearStoredKeys } from "@/lib/keys";

export default function ScenariosPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getStoredKeys()) router.push("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-grey-50">
      <div className="max-w-3xl mx-auto px-6 py-12 lg:py-16">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <h1 className="font-display text-[1.75rem] lg:text-[2.5rem] leading-[1.1] tracking-[-0.01em] text-grey-900">
              Practice
            </h1>
            <p className="mt-2 text-grey-600">
              Choose a conversation scenario.
            </p>
          </div>
          <button
            onClick={() => {
              clearStoredKeys();
              router.push("/");
            }}
            className="text-sm text-grey-600 hover:text-grey-900 transition-colors"
          >
            Change keys
          </button>
        </div>

        {/* Scenario grid */}
        <ScenarioGrid />
      </div>
    </div>
  );
}
