"use client";

import { useRef, useEffect, useState } from "react";

interface WordTooltipProps {
  word: string;
  definition: string | null;
  anchorRect: DOMRect;
  onClose: () => void;
}

export default function WordTooltip({
  word,
  definition,
  anchorRect,
  onClose,
}: WordTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; above: boolean }>({
    x: 0,
    y: 0,
    above: true,
  });

  useEffect(() => {
    const tooltipEl = tooltipRef.current;
    if (!tooltipEl) return;

    const tooltipWidth = tooltipEl.offsetWidth;
    const tooltipHeight = tooltipEl.offsetHeight;

    let x = anchorRect.left + anchorRect.width / 2 - tooltipWidth / 2;
    const gap = 8;
    let above = true;

    // Clamp x to viewport
    const margin = 8;
    if (x < margin) x = margin;
    if (x + tooltipWidth > window.innerWidth - margin) {
      x = window.innerWidth - margin - tooltipWidth;
    }

    // Position above or below the word
    let y = anchorRect.top - gap - tooltipHeight;
    if (y < margin) {
      y = anchorRect.bottom + gap;
      above = false;
    }

    setPos({ x, y, above });
  }, [anchorRect, definition]);

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 animate-tooltip-in"
      style={{ left: pos.x, top: pos.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative bg-grey-900 text-white rounded-[14px] shadow-elevated px-3 py-2 max-w-[200px]">
        {/* Caret */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent ${
            pos.above
              ? "bottom-[-6px] border-t-[6px] border-t-grey-900"
              : "top-[-6px] border-b-[6px] border-b-grey-900"
          }`}
        />

        {/* Content */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[0.6875rem] text-grey-400 font-body mb-0.5">
              {word}
            </p>
            {definition === null ? (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-grey-400 animate-bounce-dot" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-grey-400 animate-bounce-dot" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-grey-400 animate-bounce-dot" style={{ animationDelay: "300ms" }} />
              </div>
            ) : (
              <p className="text-[0.8125rem] font-body font-medium leading-snug">
                {definition}
              </p>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="flex-shrink-0 text-grey-400 hover:text-white transition-colors p-0.5"
            aria-label="Close definition"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <line x1="2" y1="2" x2="10" y2="10" />
              <line x1="10" y1="2" x2="2" y2="10" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
