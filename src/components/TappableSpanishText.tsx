"use client";

interface TappableSpanishTextProps {
  text: string;
  onWordTap: (word: string, rect: DOMRect) => void;
}

/** Strip leading/trailing punctuation for the lookup key. */
function cleanWord(raw: string): string {
  return raw.replace(/^[¿¡"«(]+|[?!."»),;:]+$/g, "");
}

export default function TappableSpanishText({
  text,
  onWordTap,
}: TappableSpanishTextProps) {
  const tokens = text.split(/\s+/);

  return (
    <span className="flex flex-wrap gap-x-1.5 gap-y-0.5">
      {tokens.map((token, i) => {
        const clean = cleanWord(token);
        if (!clean) {
          return (
            <span key={i} className="inline-block">
              {token}
            </span>
          );
        }

        return (
          <span
            key={i}
            className="inline-block cursor-pointer hover:bg-blue-50 hover:text-blue rounded px-0.5 transition-colors duration-100"
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              onWordTap(clean, rect);
            }}
          >
            {token}
          </span>
        );
      })}
    </span>
  );
}
