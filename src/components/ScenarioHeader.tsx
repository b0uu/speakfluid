"use client";

import Link from "next/link";
import type { Scenario } from "@/types";

interface ScenarioHeaderProps {
  scenario: Scenario;
  exchangeCount: number;
}

export default function ScenarioHeader({ scenario, exchangeCount }: ScenarioHeaderProps) {
  const progress = Math.min(exchangeCount / scenario.targetExchanges, 1);
  const isComplete = progress >= 1;

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl">
      <div className="max-w-[640px] mx-auto px-4 h-12 flex items-center gap-3">
        {/* Back button */}
        <Link
          href="/scenarios"
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-grey-100 transition-colors"
          aria-label="Back to scenarios"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="font-body text-sm font-medium text-grey-900 truncate">
            {scenario.title}
          </h1>
        </div>

        {/* Exchange counter */}
        <span className="flex-shrink-0 font-mono text-[0.6875rem] text-grey-400 tabular-nums">
          {exchangeCount}/{scenario.targetExchanges}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-grey-200/50 w-full">
        <div
          className={`h-full transition-all duration-500 ease-out ${
            isComplete
              ? "bg-emerald"
              : "bg-blue"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </header>
  );
}
