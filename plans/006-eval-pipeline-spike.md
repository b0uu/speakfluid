# Plan 006: Spike a tutor-quality eval pipeline (design + minimal working harness)

> **Executor instructions**: This is a SPIKE plan — the deliverable is a small
> working prototype plus a written design with open questions, not a polished
> system. Follow the steps; honor STOP conditions; when done, update this
> plan's row in `plans/README.md` and write the findings doc in Step 6.
>
> **Drift check (run first)**: `git diff --stat 9f166b5..HEAD -- src/lib/tutor.ts src/lib/tutorSchema.ts package.json`
> This plan REQUIRES plan 005's structured output to have landed
> (`src/lib/tutorSchema.ts` exists and exports `TutorResponseSchema`). If it
> hasn't, stop — running the eval against the legacy text parser builds
> throwaway checks.

## Status

- **Priority**: P2
- **Effort**: M (spike scope — coarse estimate, as direction work is)
- **Risk**: LOW (additive: new `scripts/` directory, no app-runtime changes)
- **Depends on**: plans/001-verification-baseline.md, plans/005-structured-tutor-output.md
- **Category**: direction (v2 todo item #3)
- **Planned at**: commit `9f166b5`, 2026-06-12

## Why this matters

v2 todo item #3: "Should critically evaluate response quality based on my vision of making the tutor **directing, informative, and natural-flowing**. This eval pipeline will be crucial to tuning our prompts and LLM workflows... Ideally make the pipeline simple to start and go from there." It also unblocks v2 items #5 (model comparisons need a scorecard) and #4 (mixed-language STT/TTS cases get added to this pipeline), and item #0/#7's "diagnostic" framing — the first eval run IS the baseline diagnostic future work is measured against.

The README records that prompt-tuning has been the hardest part of this project ("you need a very specific and constrained system prompt, which I will continue to iterate"). Today every prompt tweak is validated by manually playing scenarios. This spike makes a prompt change measurable in one command.

## Current state

- `src/lib/tutor.ts` — after plan 005: `sendToTutor(scenario, history, apiKey)` returns a validated `TutorResponse`; `TUTOR_SYSTEM_PROMPT` defines the behavior contract being evaluated. Importable from scripts (the OpenAI client is constructed per-call with a passed key — `src/lib/openai.ts` — so node scripts can use it; `dangerouslyAllowBrowser: true` is harmless under node).
- `src/lib/tutorSchema.ts` — after plan 005: `TutorResponseSchema`, `TutorResponse`.
- `src/lib/scenarios.ts` — exports `scenarios` array / `getScenarioById`; each has `targetExchanges`, `grammarFocus`, `completionTrigger`.
- Test harness: Vitest (plan 001), `npm test`. **The eval must NOT run under `npm test`** — it makes paid API calls and is non-deterministic; it's a separately invoked script.
- No script-runner dependency exists yet (`tsx` is the conventional choice for running TS under node, matching this repo's TS-strict setup).
- Constraint note: `docs/agents/COMMON.md` says "Client-side only for MVP. No backend proxy, no DB." A dev-only eval script does not violate this — it never ships in the app bundle and adds no runtime server. Key handling: the script reads `OPENAI_API_KEY` from the environment. **Never write a key into any file, fixture, output, or commit.**

## The quality contract being evaluated

Inline so the executor needs no other context. Deterministic checks come from the documented contracts (`docs/agents/COMMON.md`, `SPEAKFLUID_SPEC.md` §5, the prompt itself); judged dimensions come from the maintainer's stated vision (v2 todo #3):

**Deterministic (code-checked, per turn):**
- D1. Response validates against `TutorResponseSchema` on first attempt (track retry rate).
- D2. `dialogue.spanish` is ≤ 2 sentences (count `.`, `?`, `!` terminators; `¿¡` don't count).
- D3. Normal/completion turns end with a question or directive (last Spanish sentence contains `?` — or starts with an imperative; spike: check `?` presence and report the rate, don't hard-fail).
- D4. Narrator: never on a correction turn, never on turn 1, ≤ 15 words when present.
- D5. Correction turns: `correction` non-null, `dialogue` null, `correctedSpanish` non-empty, explanation contains no Spanish sentence (heuristic: no `¿¡áéíóúñ` outside quoted spans — report, don't hard-fail).
- D6. Completion: occurs within `targetExchanges ± 2` user turns; `sessionSummaryEnglish` non-empty.

**Judged (LLM-judge, per conversation, 1–5 each + one-line rationale):**
- J1. **Directing** — does the tutor tell the user exactly what to say next, never leaving them lost?
- J2. **Informative** — are corrections accurate, well-chosen (max one per turn, most important error), clearly explained?
- J3. **Natural flow** — does it read like a patient native speaker in character, not a chatbot; no loops or repeated questions?

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Install   | `npm install --save-dev tsx` | exit 0    |
| Typecheck | `npx tsc --noEmit` | exit 0              |
| Tests     | `npm test`         | all pass, eval excluded |
| Eval run  | `OPENAI_API_KEY=... npm run eval` | report written to `eval-results/` |

## Scope

**In scope**:
- `scripts/eval/` (create: `run-eval.ts`, `simulated-user.ts`, `judge.ts`, `checks.ts`, `fixtures/`)
- `package.json` (add `"eval": "tsx scripts/eval/run-eval.ts"` script + `tsx` devDependency), `package-lock.json`
- `.gitignore` (add `eval-results/`)
- `docs/planning/eval-pipeline-notes.md` (create — Step 6 findings/design doc)

**Out of scope** (do NOT touch):
- Anything in `src/` — the eval imports from it, never modifies it. If an import is impossible without changing `src/`, that's a STOP condition.
- The system prompt — this spike measures; tuning comes after.
- STT/TTS evaluation (v2 item #4 adds those cases later), CI integration, dashboards, model comparison matrices (v2 #5). Note them in the design doc instead.

## Git workflow

- Branch: `advisor/006-eval-pipeline-spike`
- Commit style: short lowercase imperative (e.g. `add eval harness spike`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Harness skeleton

`npm install --save-dev tsx`; add the `eval` script; gitignore `eval-results/`. `scripts/eval/run-eval.ts`: reads `OPENAI_API_KEY` from env (exit with a clear message if missing), accepts optional `--scenario <id>` and `--turns <n>` flags, orchestrates: for each (scenario, user-script) pair → simulate conversation → run deterministic checks → run judge → aggregate.

**Verify**: `npm run eval` without a key → exits non-zero with "OPENAI_API_KEY not set". `npx tsc --noEmit` → exit 0.

### Step 2: Simulated user

`scripts/eval/simulated-user.ts` + `fixtures/`. Two modes, both spike-simple:

- **Scripted**: a fixture file per persona — an ordered list of user utterances for a given scenario. Create two for `ordering-food` and two for `introducing-yourself`: one *clean* speaker (correct A2 Spanish) and one *error-prone* speaker (3+ planted grammar errors, e.g. gender agreement, wrong preterite — note the planted errors in the fixture as comments so J2 accuracy can be judged). When the script runs out of lines, fall back to LLM mode.
- **LLM-simulated**: `gpt-4o-mini` with a short system prompt: "You are an A2-level English-speaking Spanish learner in this roleplay: <situation>. Reply with ONE short Spanish utterance; make occasional beginner mistakes."

Conversation loop mirrors the app: seed history with the scenario `openingLine` as a tutor message, alternate user/`sendToTutor` until `responseType === "completion"` or a hard cap of `targetExchanges + 4` turns.

**Verify**: with a key, `npm run eval -- --scenario ordering-food --turns 3` completes a 3-turn conversation and prints the transcript.

### Step 3: Deterministic checks

`scripts/eval/checks.ts` implementing D1–D6 from "The quality contract being evaluated". Each check returns `{ id, pass | rate, detail }`. Hard-fail vs report-only is specified per check above.

**Verify**: unit-test the pure check functions against hand-built `TutorResponse` fixtures in `scripts/eval/checks.test.ts` — these ARE allowed in `npm test` (no network). `npm test` → passes.

### Step 4: LLM judge

`scripts/eval/judge.ts`: one call per conversation. Model `gpt-4o-mini` for the spike (note in the design doc that a stronger judge, e.g. the latest small reasoning-capable model, is an open question). Input: full transcript (tutor JSON + user text) + scenario context + the J1–J3 rubric verbatim. Output: structured via a Zod schema `{ directing: 1-5, informative: 1-5, naturalFlow: 1-5, rationale: string }` using the same `zodResponseFormat` pattern as `src/lib/tutor.ts`. Temperature 0.

**Verify**: a full eval run produces judge scores for each conversation.

### Step 5: Report

Aggregate to `eval-results/<ISO-date>-<git-short-sha>.md`: per-conversation table (scenario, persona, turns, D1–D6 results, J1–J3 scores), overall averages, total tokens/estimated cost, and the raw transcripts in a collapsible section. Also emit the same data as `.json` next to it for future diffing.

**Verify**: `OPENAI_API_KEY=... npm run eval` → report file exists, contains all 4 conversations (2 scenarios × 2 personas), and `git status` shows no `eval-results/` files staged.

### Step 6: Design doc — the actual spike deliverable

Write `docs/planning/eval-pipeline-notes.md`: baseline scores from the first full run (this is the v2 #0 "current diagnostic"); cost + wall-time per run; which checks proved noisy vs useful; and the open questions for the maintainer, at minimum: judge model choice and whether to pin it; how many runs to average given temperature 0.7 in the tutor; regression thresholds (what score drop blocks a prompt change); whether eval should eventually run in CI on prompt-file diffs; how STT/TTS cases (v2 #4) and model comparison (v2 #5) slot in.

**Verify**: file exists; contains baseline numbers, not placeholders.

## Test plan

- `scripts/eval/checks.test.ts` — pure-function unit tests for D2–D6 (D1 is Zod itself), runnable in `npm test` without network. Model after `src/lib/tutor.test.ts`'s structure.
- The eval itself is exercised by the Step 5 full run (4 conversations, real API) — paid and operator-triggered, never in CI for this spike.

## Done criteria

- [ ] `OPENAI_API_KEY=... npm run eval` produces a markdown + json report covering 2 scenarios × 2 personas
- [ ] `npm test` exits 0 and makes zero network calls (eval excluded; checks unit tests included)
- [ ] `npx tsc --noEmit` exits 0
- [ ] `eval-results/` is gitignored; no API key appears in any committed file (`grep -rn "sk-" scripts/ docs/` → no matches)
- [ ] `docs/planning/eval-pipeline-notes.md` contains baseline scores and the open-questions list
- [ ] No `src/` file modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 005 hasn't landed (`src/lib/tutorSchema.ts` missing).
- Importing `src/lib/tutor.ts` from a node script fails (e.g. a `"use client"`/bundler issue) and fixing it would require modifying `src/`.
- A single full eval run costs more than ~$1 in tokens (report the number — cadence becomes an operator decision).
- The judge's scores are obviously degenerate (all 5s / all identical) after one rubric-wording iteration.

## Maintenance notes

- This harness is the substrate for v2 items #4 (add STT/TTS cases), #5 (loop over a models list), and #7 (compare diagnostics over time via the `.json` outputs). Keep `checks.ts` pure and schema-driven so those extensions don't need rework.
- The fixtures encode planted errors — when the prompt's correction pedagogy changes, re-check that the planted errors still trigger corrections (D5 silently weakens otherwise).
- Reviewer focus: no key material anywhere; eval excluded from `npm test`; the report actually distinguishes the clean vs error-prone personas (if both score identically, the eval isn't measuring anything).
