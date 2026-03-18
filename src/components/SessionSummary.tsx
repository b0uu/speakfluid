"use client";

import { useRouter } from "next/navigation";
import { getNextScenarioId } from "@/lib/scenarios";

interface SessionSummaryProps {
  scenarioId: string;
  summaryText: string;
}

export default function SessionSummary({ scenarioId, summaryText }: SessionSummaryProps) {
  const router = useRouter();
  const nextId = getNextScenarioId(scenarioId);

  return (
    <div className="fixed inset-0 z-30 bg-grey-50 flex items-center justify-center px-6 animate-fade-in-up">
      <div className="max-w-md w-full text-center">
        {/* Checkmark */}
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald/10 flex items-center justify-center mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 className="font-display text-2xl text-grey-900 mb-2">
          Scenario Complete
        </h2>

        <p className="text-grey-600 leading-relaxed mb-8">
          {summaryText || "Great work! You completed this conversation scenario."}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.push(`/session/${nextId}`)}
            className="w-full h-12 bg-blue text-white font-medium rounded-lg hover:bg-blue-light transition-colors"
          >
            Next Scenario
          </button>
          <button
            onClick={() => router.push("/scenarios")}
            className="w-full text-sm text-grey-600 hover:text-grey-900 transition-colors py-2"
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
