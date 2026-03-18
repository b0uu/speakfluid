import type { Scenario } from "@/types";

interface SceneIntroProps {
  scenario: Scenario;
  onBegin: () => void;
}

/** Rewrite situation text from third person to second person. */
function rewriteForImmersion(text: string): string {
  return text
    .replace(/\bThe user\b/g, "You")
    .replace(/\bthe user\b/g, "you")
    .replace(/\bThe user's\b/g, "Your")
    .replace(/\bthe user's\b/g, "your");
}

/** Extract a character name from the tutorRole string. */
function extractCharacterName(tutorRole: string): { name: string; description: string } {
  const namedMatch = tutorRole.match(/named\s+(\S+)/i);
  if (namedMatch) {
    const name = namedMatch[1].replace(/[,.]$/, "");
    const description = tutorRole
      .replace(/named\s+\S+/i, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .replace(/^a\s+/i, "A ");
    return { name, description };
  }
  return { name: "", description: tutorRole };
}

const difficultyMeta: Record<string, { label: string; color: string }> = {
  beginner: { label: "Beginner", color: "bg-emerald/10 text-emerald" },
  intermediate: { label: "Intermediate", color: "bg-blue/10 text-blue" },
  advanced: { label: "Advanced", color: "bg-grey-900/10 text-grey-900" },
};

export default function SceneIntro({ scenario, onBegin }: SceneIntroProps) {
  const { name, description } = extractCharacterName(scenario.tutorRole);
  const immersiveSituation = rewriteForImmersion(scenario.situation);
  const diff = difficultyMeta[scenario.difficulty] || { label: scenario.difficulty, color: "bg-grey-100 text-grey-600" };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-grey-100">
      <div className="w-full max-w-[520px] animate-fade-in-up">
        {/* Main card */}
        <div className="bg-white rounded-2xl ring-1 ring-grey-200/60 shadow-elevated overflow-hidden">
          {/* Header band */}
          <div className="px-6 pt-7 pb-5 text-center">
            <span className="text-5xl block mb-3">{scenario.icon}</span>
            <h1 className="font-display text-[1.5rem] sm:text-[1.75rem] leading-tight tracking-tight text-grey-900">
              {scenario.title}
            </h1>
            <span
              className={`inline-block mt-2.5 px-2.5 py-0.5 rounded-md text-[0.6875rem] font-medium uppercase tracking-wider ${diff.color}`}
            >
              {diff.label}
            </span>
          </div>

          {/* Content sections */}
          <div className="px-6 pb-6 space-y-5">
            <div className="h-px bg-grey-200/60" />

            {/* Scene */}
            <section>
              <SectionLabel>The Scene</SectionLabel>
              <p className="font-body text-[0.9375rem] leading-relaxed text-grey-600">
                {immersiveSituation}
              </p>
            </section>

            {/* Roles — two column on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <section className="rounded-xl bg-grey-50 px-4 py-3">
                <SectionLabel>Your Role</SectionLabel>
                <p className="font-body text-[0.875rem] text-grey-900 leading-snug">
                  {scenario.userRole}
                </p>
              </section>

              <section className="rounded-xl bg-grey-50 px-4 py-3">
                <SectionLabel>You&apos;ll Meet</SectionLabel>
                <p className="font-body text-[0.875rem] text-grey-900 leading-snug">
                  {name ? (
                    <>
                      <span className="font-medium">{name}</span>
                      {description && (
                        <span className="text-grey-600"> &mdash; {description.replace(/^A\s+/i, "a ")}</span>
                      )}
                    </>
                  ) : (
                    description
                  )}
                </p>
              </section>
            </div>

            {/* Practice focus */}
            <section>
              <SectionLabel>What You&apos;ll Practice</SectionLabel>
              <p className="font-body text-sm text-grey-600 mb-2.5">
                <span className="text-grey-900 font-medium">Grammar:</span>{" "}
                {scenario.grammarFocus}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {scenario.keyVocabulary.map((word) => (
                  <span
                    key={word}
                    className="inline-block px-2.5 py-1 bg-blue-50 text-blue text-[0.6875rem] font-mono rounded-md ring-1 ring-blue/10"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </section>
          </div>

          {/* Begin button — full bleed */}
          <div className="px-6 pb-6">
            <button
              onClick={onBegin}
              className="w-full h-12 bg-grey-900 text-white font-medium rounded-xl hover:bg-grey-900/90 active:scale-[0.98] transition-all text-[0.9375rem]"
            >
              Begin Conversation
            </button>
          </div>
        </div>

        {/* Subtle hint */}
        <p className="text-center mt-4 text-[0.6875rem] text-grey-400 font-body">
          Tap any Spanish word during the conversation for its meaning
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-body text-[0.625rem] uppercase tracking-[0.12em] text-grey-400 mb-1.5">
      {children}
    </h2>
  );
}
