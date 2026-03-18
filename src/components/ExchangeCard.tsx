"use client";

import { useState } from "react";
import type { Exchange } from "@/types";

interface ExchangeCardProps {
  exchange: Exchange;
  isActive: boolean;
  spanishTextRenderer?: (text: string) => React.ReactNode;
}

export default function ExchangeCard({
  exchange,
  isActive,
  spanishTextRenderer,
}: ExchangeCardProps) {
  const [showEnglish, setShowEnglish] = useState(false);
  const { tutorMessage, userMessage, correction, userRetry, narratorText } = exchange;
  const isCompletion = tutorMessage.type === "completion";

  const spanishText = tutorMessage.spanishText || tutorMessage.content;
  const englishText = tutorMessage.englishText;

  return (
    <div className="animate-fade-in-up">
      {/* Narrator text — above the card */}
      {narratorText && (
        <div className="flex items-center gap-2.5 mb-3 pl-1">
          <div className="w-4 h-px bg-grey-200" />
          <p className="font-body text-[0.8125rem] italic text-grey-400 leading-snug">
            {narratorText}
          </p>
        </div>
      )}

      {/* Card */}
      <div
        className={`relative rounded-2xl transition-shadow duration-300 ${
          isCompletion
            ? "bg-gradient-to-br from-emerald/[0.04] to-emerald/[0.08] ring-1 ring-emerald/20"
            : isActive
            ? "bg-white ring-1 ring-grey-200/80 shadow-elevated"
            : "bg-white ring-1 ring-grey-200/60 shadow-card"
        }`}
      >
        {/* Exchange number chip */}
        <div className="absolute -top-2.5 left-5">
          <span
            className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[0.625rem] font-mono font-medium ${
              isCompletion
                ? "bg-emerald text-white"
                : "bg-grey-900 text-white"
            }`}
          >
            {exchange.index + 1}
          </span>
        </div>

        <div className="px-5 pt-6 pb-5 sm:px-6">
          {/* Tutor Spanish text */}
          <div className="font-display text-[1.25rem] sm:text-[1.375rem] leading-[1.55] text-grey-900 tracking-[-0.01em]">
            {spanishTextRenderer ? spanishTextRenderer(spanishText) : (
              <p>{spanishText}</p>
            )}
          </div>

          {/* Translate toggle + English */}
          {englishText && (
            <div className="mt-3">
              <button
                onClick={() => setShowEnglish(!showEnglish)}
                className="inline-flex items-center gap-1.5 text-[0.75rem] text-grey-400 hover:text-blue transition-colors font-body group"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 group-hover:opacity-100 transition-opacity">
                  <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {showEnglish ? "Hide" : "Translate"}
              </button>
              <div
                className={`grid transition-all duration-200 ease-out ${
                  showEnglish ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="font-body text-[0.875rem] text-grey-500 leading-relaxed">
                    {englishText}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Completion badge */}
          {isCompletion && (
            <div className="mt-4 pt-4 border-t border-emerald/10">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="#10B981" fillOpacity="0.15" />
                  <path d="M5 8l2 2 4-4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[0.75rem] font-medium text-emerald tracking-wide uppercase">
                  Complete
                </span>
              </div>
              {tutorMessage.summaryText && (
                <p className="font-body text-sm text-grey-600 leading-relaxed">
                  {tutorMessage.summaryText}
                </p>
              )}
            </div>
          )}

          {/* Correction — inline section */}
          {correction && (
            <div className="mt-4 -mx-5 sm:-mx-6 px-5 sm:px-6 py-3.5 bg-amber-50 border-y border-amber/10">
              <div className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="mt-0.5 flex-shrink-0">
                  <circle cx="8" cy="8" r="7" stroke="#D97706" strokeWidth="1.5" />
                  <path d="M8 5v3M8 10.5v.5" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div>
                  <p className="font-body text-[0.875rem] text-grey-900 leading-relaxed">
                    {correction.correctionExplanation || correction.content}
                  </p>
                  {correction.correctionTarget && (
                    <div className="mt-2 rounded-lg bg-white/70 ring-1 ring-amber/10 px-3 py-2">
                      <p className="text-[0.625rem] uppercase tracking-[0.12em] text-amber/80">
                        Correct Spanish
                      </p>
                      <p className="mt-1 font-display text-[1rem] leading-relaxed text-grey-900">
                        {correction.correctionTarget}
                      </p>
                    </div>
                  )}
                  {correction.retryPrompt && (
                    <p className="mt-1.5 font-body text-[0.8125rem] font-medium text-amber">
                      {correction.retryPrompt}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Divider + User response section */}
          {!isCompletion && (
            <>
              <div className="h-px bg-grey-200/60 my-4" />

              <div className="flex items-start gap-3">
                {/* You indicator */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue/10 flex items-center justify-center mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D5BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  {userMessage && userRetry ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[0.625rem] uppercase tracking-[0.12em] text-grey-400 mb-1">
                          First try
                        </p>
                        <p className="font-mono text-[0.875rem] text-grey-500 leading-relaxed">
                          {userMessage.content}
                        </p>
                      </div>
                      <div>
                        <p className="text-[0.625rem] uppercase tracking-[0.12em] text-blue/70 mb-1">
                          Retry
                        </p>
                        <p className="font-mono text-[0.9375rem] text-grey-900 leading-relaxed">
                          {userRetry.content}
                        </p>
                      </div>
                    </div>
                  ) : userRetry ? (
                    <p className="font-mono text-[0.9375rem] text-grey-900 leading-relaxed">
                      {userRetry.content}
                    </p>
                  ) : userMessage ? (
                    <p className="font-mono text-[0.9375rem] text-grey-900 leading-relaxed">
                      {userMessage.content}
                    </p>
                  ) : isActive ? (
                    <div className="flex items-center gap-2 py-0.5">
                      <span className="font-body text-sm text-grey-400">
                        Your turn
                      </span>
                      <span className="flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-grey-300 animate-bounce-dot" />
                        <span className="w-1 h-1 rounded-full bg-grey-300 animate-bounce-dot [animation-delay:0.15s]" />
                        <span className="w-1 h-1 rounded-full bg-grey-300 animate-bounce-dot [animation-delay:0.3s]" />
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
