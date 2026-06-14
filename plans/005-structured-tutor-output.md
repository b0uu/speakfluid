# Plan 005: Replace the heuristic parser with structured JSON output validated by Zod

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9f166b5..HEAD -- src/lib/tutor.ts src/hooks/useConversation.ts src/types/index.ts`
> Plans 003 and 004 are EXPECTED to have modified `useConversation.ts` and
> `tutor.ts` before this plan runs — read both files fully before starting.
> If `parseTutorResponse` no longer exists, this plan already landed; stop.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED — changes the core LLM contract; tutor response *quality* must be manually re-validated, not just types
- **Depends on**: plans/001-verification-baseline.md (required), plans/004-tts-contract-fixes.md (required — this plan preserves its speech contract)
- **Category**: direction (v2 todo item #2)
- **Planned at**: commit `9f166b5`, 2026-06-12

## Why this matters

This is item #2 of `docs/planning/v2_todo.md`: "Instead of prompting LLM to return text in a specific textual format and then using our parser function, we instead need to have structured JSON output from LLM ... and validate with Zod. This will make eval implementation a lot easier, and set up stage to implement bilingual TTS correctly."

The current parser is ~200 lines of regex heuristics (`src/lib/tutor.ts:125-327`): correction detection depends on the model starting with one of 7 hardcoded English words ("almost", "close", "good try", ...), the corrected Spanish is recovered by hunting for curly-quoted substrings, and English/Spanish are separated by whether a line starts with `(`. Every prompt tweak risks silent misclassification. OpenAI's structured outputs (`gpt-4o-mini` supports strict JSON schema) make the model emit the fields directly; Zod validates at runtime. The parser, its failure modes, and findings #6/#7's root causes largely disappear.

## Current state

(Read the live files — plans 003/004 have touched them. Line numbers below are from commit `9f166b5` and may have shifted slightly.)

- `src/lib/tutor.ts` — contains `TUTOR_SYSTEM_PROMPT` (lines 4–123; the `<bilingual_output_format>` section at ~63–94 prescribes the text format this plan retires), `buildMessages` (136–173), the parser helpers (175–327), `sendToTutor` (329–347, returns the raw string), `parseTutorResponse` (349–391), `buildTutorSpeechText` (after plan 004: takes `parsed` only, returns Spanish-or-empty).
- `src/hooks/useConversation.ts` — `addTutorMessage(rawResponse: string)` calls `parseTutorResponse` and builds a `Message` whose `content` is the raw text (lines 28–56); two pipelines call `sendToTutor` then `addTutorMessage` then TTS.
- `src/types/index.ts` — `ParsedTutorResponse` (lines 45–54) is the shape the UI components consume via `Message` fields. **The UI must not change in this plan** — `ExchangeCard.tsx` renders `spanishText`, `englishText`, `correctionExplanation`, `correctionTarget`, `retryPrompt`, `summaryText`, `narratorText`.
- `openai` SDK is v4.104.0 — it ships the Zod helper at `openai/helpers/zod` (`zodResponseFormat`). `zod` is NOT yet a dependency.
- History handling: tutor `Message.content` is fed back verbatim as `assistant` messages in `buildMessages`. After this plan, assistant history will be JSON strings — that is acceptable and self-consistent (the model sees its own prior output format).
- `max_tokens: 250` today; JSON syntax overhead means this must rise (Step 4 sets 400) or responses will truncate into invalid JSON.

Documented constraints this plan must honor (`docs/agents/COMMON.md`): three response types (`normal`/`correction`/`completion`), optional visual-only narrator line, Spanish-first TTS, "Parser should be strict enough for UI rendering but tolerant to minor format drift" (Zod + one retry satisfies this), and "any unrecoverable API/audio error must return to IDLE and show user-visible feedback" (already handled by the callers' catch/finally — keep `sendToTutor`'s thrown errors as `Error` with a user-readable message).

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Install   | `npm install zod`  | exit 0              |
| Typecheck | `npx tsc --noEmit` | exit 0              |
| Lint      | `npm run lint`     | exit 0              |
| Tests     | `npm test`         | all pass            |
| Build     | `npm run build`    | exit 0              |
| Dev server| `npm run dev`      | serves on :3000 (manual quality pass — REQUIRED, see Step 7) |

## Scope

**In scope**:
- `package.json` / `package-lock.json` (add `zod`)
- `src/lib/tutorSchema.ts` (create — Zod schema + inferred type)
- `src/lib/tutor.ts` (rewrite: prompt format section, `sendToTutor`, adapter, speech derivation; delete parser helpers)
- `src/lib/tutor.test.ts` (replace parser characterization with schema/adapter/speech tests)
- `src/hooks/useConversation.ts` (adjust `addTutorMessage` + `sendToTutor` call sites)
- `SPEAKFLUID_SPEC.md` (update §5 references to `parseTutorResponse` — a few lines only)

**Out of scope** (do NOT touch):
- All UI components and `src/types/index.ts`'s `Message`/`ParsedTutorResponse`/`Exchange` shapes — the adapter preserves them exactly.
- `src/lib/exchanges.ts` and its tests.
- `src/lib/stt.ts`, `src/lib/tts.ts` — bilingual/mixed-language TTS is v2 item #4, a LATER plan; this plan only *stages* it via speech segments.
- Conversational prompt content (tone, correction pedagogy, pacing rules) — only the *format* sections of the prompt change. Do not "improve" the tutor's personality.
- Model choice (`gpt-4o-mini` stays; comparisons are v2 item #5).

## Git workflow

- Branch: `advisor/005-structured-tutor-output`
- Commit per step; message style: short lowercase imperative (e.g. `add zod tutor response schema`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add Zod and define the schema

`npm install zod`. Create `src/lib/tutorSchema.ts`:

```ts
import { z } from "zod";

// Strict structured-output schema for tutor turns. All fields required +
// nullable (OpenAI strict mode does not support optional fields).
export const TutorResponseSchema = z.object({
  responseType: z.enum(["normal", "correction", "completion"]),
  // Visual-only third-person scene line; null on corrections and first turn.
  narratorLine: z.string().nullable(),
  // In-character dialogue; null only when responseType is "correction".
  dialogue: z
    .object({
      spanish: z.string(),
      english: z.string(),
    })
    .nullable(),
  // Present only when responseType is "correction".
  correction: z
    .object({
      explanationEnglish: z.string(),
      correctedSpanish: z.string(),
      retryPromptEnglish: z.string(),
    })
    .nullable(),
  // Present only when responseType is "completion".
  sessionSummaryEnglish: z.string().nullable(),
});

export type TutorResponse = z.infer<typeof TutorResponseSchema>;
```

Design note (do not deviate): there is deliberately **no** `speechSegments` field in the schema. Speech is *derived* in code from the semantic fields (Step 3) so there is a single source of truth — an LLM-emitted segments array could contradict the dialogue fields. The derivation function returns `{ language, text }[]`, which is exactly the staging v2 item #4 (bilingual TTS) needs.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Rewrite `sendToTutor` to return a validated `TutorResponse`

In `src/lib/tutor.ts`:

1. Import `zodResponseFormat` from `"openai/helpers/zod"` and the schema. Use `client.chat.completions.parse({...})` if it typechecks on this SDK version; otherwise `client.beta.chat.completions.parse({...})` — `tsc` is the arbiter.
2. New signature: `sendToTutor(scenario, history, apiKey): Promise<{ structured: TutorResponse; rawJson: string }>` — `rawJson` (i.e. `JSON.stringify(structured)` or the message content) is stored as `Message.content` so history round-trips.
3. Request params: keep `model: "gpt-4o-mini"`, `temperature: 0.7`; set `max_tokens: 400`; drop `presence_penalty`/`frequency_penalty` (they shaped the old free-text format; with a schema they add no value). Add `response_format: zodResponseFormat(TutorResponseSchema, "tutor_response")`.
4. Validation + retry: if the SDK throws (refusal, truncation, schema mismatch) — retry ONCE with the same messages; on second failure throw `new Error("The tutor had trouble responding. Please try again.")` (the callers' existing catch displays it and returns to IDLE).

**Verify**: `npx tsc --noEmit` → exit 0 (call sites in `useConversation.ts` will now error — fixed in Step 5; verify tutor.ts in isolation compiles by checking the error list contains only `useConversation.ts` lines).

### Step 3: Adapter + speech derivation; delete the parser

Still in `src/lib/tutor.ts`:

1. Add `export function toParsedTutorResponse(r: TutorResponse): ParsedTutorResponse` mapping: `responseType→type`, `dialogue.spanish→spanishText`, `dialogue.english→englishText`, `correction.explanationEnglish→correctionExplanation`, `correction.correctedSpanish→correctionTarget`, `correction.retryPromptEnglish→retryPrompt` (prefix with `"Try again: "` if it doesn't already start with it — `ExchangeCard` renders it verbatim), `sessionSummaryEnglish→summaryText`, `narratorLine→narratorText`. Map `null` → `undefined`.
2. Add `export function deriveSpeechSegments(r: TutorResponse): Array<{ language: "es" | "en"; text: string }>`: corrections → `[{ language: "es", text: correction.correctedSpanish }]` (empty array if blank); normal/completion → `[{ language: "es", text: dialogue.spanish }]` if non-empty, else `[]`. Narrator and English are never segments (visual-only contract).
3. Rewrite `buildTutorSpeechText(parsed | r)` — keep the plan-004 contract: implement as `deriveSpeechSegments(r).filter(s => s.language === "es").map(s => s.text).join(" ")`, returning `""` when there's nothing to speak. Choose the parameter type that keeps call sites simplest (the structured response is available at both call sites after Step 5).
4. **Delete**: `parseTutorResponse`, `NARRATOR_LINE_REGEX`, `CORRECTION_STARTERS`, `normalizeWhitespace`, `cleanDialogueLine`, `cleanEnglishLine`, `stripNarratorLine`, `extractQuotedSegments`, `splitCorrectionText`, `extractCorrectionTarget`, `normalizeCorrectionExplanation`, `isCorrectionResponse`, `parseDialogue`.

**Verify**: `grep -n "parseTutorResponse\|CORRECTION_STARTERS" src/lib/tutor.ts` → no matches.

### Step 4: Update the system prompt's format sections

In `TUTOR_SYSTEM_PROMPT`, replace `<bilingual_output_format>` with a `<output_fields>` section describing the JSON fields and when each is null (mirror the schema comments in Step 1: corrections have `correction` set and `dialogue`/`narratorLine` null; completions set `sessionSummaryEnglish`; etc.). Remove text-format mechanics that no longer apply: the `[NARRATOR]` prefix instruction (the field replaces it — keep the *content* rules: ≤15 words, third person, every 2–3 turns, never on corrections/first turn), the `[SCENARIO_COMPLETE]` marker instructions in `<conversation_rules>` rule 5 and `<pacing_and_completion>` (replace with: set `responseType` to `"completion"` and fill `sessionSummaryEnglish` with the 2–3 sentence English summary), the "Do NOT include literal labels" / quote-format / "Try again:" line-format instructions (keep the pedagogy: one error max, 1–2 sentence English explanation, corrected Spanish in `correctedSpanish`). Keep `<core_identity>`, `<error_correction_protocol>` pedagogy, `<what_not_to_do>` (drop its "3 lines of text" formatting rule), `<handling_edge_cases>` unchanged.

**Verify**: `grep -n "SCENARIO_COMPLETE\|\[NARRATOR\]\|ENGLISH CORRECTION" src/lib/tutor.ts` → no matches.

### Step 5: Update `useConversation.ts`

Change `addTutorMessage` to accept the `{ structured, rawJson }` result: `parsed = toParsedTutorResponse(structured)`, `content: rawJson`, rest of the `Message` fields as today. Update both pipelines' `sendToTutor` calls and the TTS blocks to the new `buildTutorSpeechText` parameter. Everything else (state machine, error handling, plan-003 cleanup, plan-004 empty-string gate) stays.

**Verify**: `npx tsc --noEmit` → exit 0; `npm run lint` → exit 0.

### Step 6: Replace the parser tests

In `src/lib/tutor.test.ts`: delete the `parseTutorResponse` characterization suite (its subject is gone). Add:

1. `TutorResponseSchema` fixtures: a valid normal turn, valid correction, valid completion all parse; missing field / wrong enum / non-null violations fail `safeParse`.
2. `toParsedTutorResponse`: each of the three types maps to the exact `ParsedTutorResponse` the UI expects (assert every field, including `null→undefined` and the `"Try again: "` prefixing rule).
3. `deriveSpeechSegments` + `buildTutorSpeechText`: correction → corrected Spanish only; normal/completion → Spanish dialogue only; empty dialogue/correction → `[]` / `""`; output never contains the English fields' text.

Keep `src/lib/exchanges.test.ts` untouched and passing.

**Verify**: `npm test` → all pass.

### Step 7: REQUIRED manual quality pass

`npm run dev` with real keys (operator-provided). Play at least 2 full scenarios end to end (one beginner, one intermediate), deliberately making 2–3 Spanish errors to trigger corrections. Confirm: corrections render with explanation + corrected Spanish + retry line; only Spanish is ever spoken; narrator lines appear occasionally and are not spoken; completion fires near the target exchange count with a sensible English summary; turn latency feels comparable to before. **Record what you observed in your report.** If you cannot run a browser with real keys, this plan CANNOT be marked DONE — mark it BLOCKED(awaiting manual quality pass) in `plans/README.md`.

## Test plan

Steps 6 (automated: schema fixtures, adapter mapping, speech derivation — model after the structure of plan 001's tests) and 7 (manual conversational quality — mandatory because structured outputs can subtly change tutor behavior even when every type checks).

## Done criteria

- [ ] `npm test` exits 0 with the Step-6 suites present
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` all exit 0
- [ ] `grep -rn "parseTutorResponse" src/` → no matches
- [ ] `grep -rn "SCENARIO_COMPLETE" src/` → no matches
- [ ] `zod` present in `package.json` dependencies
- [ ] `SPEAKFLUID_SPEC.md` §5 no longer references `parseTutorResponse` (now references the schema/adapter)
- [ ] Step-7 manual pass completed and reported (or plan marked BLOCKED)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `zodResponseFormat` / `.parse()` doesn't exist or typecheck on the installed `openai` SDK — report the SDK version and the exact error; do NOT hand-roll JSON-mode prompting as a workaround.
- The model's structured responses are valid but conversationally degraded in Step 7 (robotic, missing corrections, premature completions) after one prompt-format iteration attempt.
- Preserving the UI requires changing `ParsedTutorResponse` or any component file.
- Plans 001 or 004 have not landed.

## Maintenance notes

- v2 item #4 (mixed-language TTS) builds directly on `deriveSpeechSegments` — corrections gain an English explanation segment there; the schema itself should not need to change.
- v2 item #3 (eval pipeline, plan 006) consumes `TutorResponseSchema` for its deterministic checks — keep the schema exported and free of app-only imports.
- Reviewer focus: the prompt diff (Step 4) — verify pedagogy/persona rules survived and only format mechanics were removed; and the adapter's `null→undefined` handling (strict TS hides `undefined` vs `null` bugs poorly across that boundary).
- Deferred: findings #6 (retry-inflated exchange count) and #7 (double-correction rendering) become much easier after this lands (`responseType` is now authoritative) — they are intentionally not fixed here.
