"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import type { Message, Scenario } from "@/types";
import { groupIntoExchanges } from "@/lib/exchanges";
import { lookupWord } from "@/lib/wordLookup";
import { getStoredKeys } from "@/lib/keys";
import ExchangeCard from "./ExchangeCard";
import TappableSpanishText from "./TappableSpanishText";
import WordTooltip from "./WordTooltip";

interface ImmersiveDialogueViewProps {
  messages: Message[];
  scenario: Scenario;
}

export default function ImmersiveDialogueView({
  messages,
  scenario,
}: ImmersiveDialogueViewProps) {
  const exchanges = useMemo(() => groupIntoExchanges(messages), [messages]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Word tooltip state
  const [activeTooltip, setActiveTooltip] = useState<{
    word: string;
    sentenceContext: string;
    definition: string | null;
    anchorRect: DOMRect;
  } | null>(null);

  // IntersectionObserver for opacity
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleIds((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const id = entry.target.getAttribute("data-exchange-id");
            if (!id) continue;
            if (entry.isIntersecting) {
              next.add(id);
            } else {
              next.delete(id);
            }
          }
          return next;
        });
      },
      { threshold: 0.3 }
    );

    const refs = cardRefs.current;
    refs.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [exchanges.length]);

  // Auto-scroll to bottom when new exchanges appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [exchanges.length]);

  // Word tap handler
  const handleWordTap = useCallback(
    (word: string, rect: DOMRect, sentenceContext: string) => {
      setActiveTooltip({ word, sentenceContext, definition: null, anchorRect: rect });

      const keys = getStoredKeys();
      if (!keys) return;

      lookupWord(word, sentenceContext, keys.openai).then((def) => {
        setActiveTooltip((prev) =>
          prev && prev.word === word ? { ...prev, definition: def } : prev
        );
      });
    },
    []
  );

  // Dismiss tooltip on outside click
  useEffect(() => {
    if (!activeTooltip) return;
    function handleClick() {
      setActiveTooltip(null);
    }
    // Delay listener to avoid immediately dismissing on the same click
    const timer = setTimeout(() => {
      window.addEventListener("click", handleClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleClick);
    };
  }, [activeTooltip]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto px-4 py-8"
      style={{ scrollSnapType: "y proximity" }}
    >
      {/* Static opening narrator from scenario situation */}
      {exchanges.length > 0 && !exchanges[0].narratorText && (
        <div className="max-w-[540px] mx-auto mb-6 flex items-center gap-3 pl-1">
          <div className="w-5 h-px bg-grey-200" />
          <p className="font-body text-[0.8125rem] italic text-grey-400 leading-snug">
            {rewriteForImmersion(scenario.situation).split(".").slice(0, 2).join(".").trim()}.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-10 max-w-[540px] mx-auto pb-4">
        {exchanges.map((exchange, i) => {
          const isActive = i === exchanges.length - 1;
          const isVisible = visibleIds.has(exchange.id) || isActive;

          return (
            <div
              key={exchange.id}
              data-exchange-id={exchange.id}
              ref={(el) => {
                if (el) cardRefs.current.set(exchange.id, el);
                else cardRefs.current.delete(exchange.id);
              }}
              className={`transition-opacity duration-500 ${
                isVisible ? "opacity-100" : "opacity-50"
              }`}
              style={{ scrollSnapAlign: isActive ? "end" : undefined }}
            >
              <ExchangeCard
                exchange={exchange}
                isActive={isActive}
                spanishTextRenderer={(text) => (
                  <TappableSpanishText
                    text={text}
                    onWordTap={(word, rect) =>
                      handleWordTap(word, rect, text)
                    }
                  />
                )}
              />
            </div>
          );
        })}
      </div>

      <div ref={bottomRef} />

      {/* Word tooltip */}
      {activeTooltip && (
        <WordTooltip
          word={activeTooltip.word}
          definition={activeTooltip.definition}
          anchorRect={activeTooltip.anchorRect}
          onClose={() => setActiveTooltip(null)}
        />
      )}
    </div>
  );
}

function rewriteForImmersion(text: string): string {
  return text
    .replace(/\bThe user\b/g, "You")
    .replace(/\bthe user\b/g, "you")
    .replace(/\bThe user's\b/g, "Your")
    .replace(/\bthe user's\b/g, "your");
}
