# Plan 001: Establish a verification baseline (Vitest + characterization tests + CI)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9f166b5..HEAD -- src/lib/tutor.ts src/lib/exchanges.ts package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `9f166b5`, 2026-06-12

## Why this matters

This repo has zero automated tests and no test runner (`package.json` has no `test` script; the spec's §9 admits "No automated tests"). The most fragile code is the 328-line heuristic tutor-response parser in `src/lib/tutor.ts`, which the v2 roadmap (`docs/planning/v2_todo.md`) plans to replace with structured JSON output. Item #0 of that roadmap is literally "Run tests on current Speakfluid MVP to get a basis for future improvement." This plan creates that basis: a test harness, characterization tests that pin down the parser's *current* behavior (bugs included), and a CI gate so future plans can verify themselves with one command.

**Characterization means: assert what the code DOES today, not what it should do.** Several known quirks are captured deliberately (see Step 4); later plans fix them and update the assertions.

## Current state

- `package.json` — scripts are only `dev` / `build` / `start` / `lint`. No test script, no test dependencies.
- `src/lib/tutor.ts` — exports `sendToTutor` (network, do not test), `parseTutorResponse(raw: string): ParsedTutorResponse` (pure), `buildTutorSpeechText(raw: string, parsed: ParsedTutorResponse): string` (pure). Internal helpers (`splitCorrectionText`, `isCorrectionResponse`, etc.) are not exported — test them through the two exported pure functions.
- `src/lib/exchanges.ts` — exports `groupIntoExchanges(messages: Message[]): Exchange[]` (pure).
- `src/types/index.ts` — `Message`, `ParsedTutorResponse`, `Exchange` types.
- TypeScript is strict (`tsconfig.json` has `"strict": true`); path alias `@/*` → `./src/*`.
- There is no CI; deploys are Vercel auto-deploy from GitHub on push to `main`.

Key parser behaviors (verified by reading `src/lib/tutor.ts` at commit `9f166b5`):

- `parseTutorResponse` returns `type: "completion"` when raw contains `[SCENARIO_COMPLETE]`; text after the marker (minus an optional `Session summary:` prefix) becomes `summaryText` (`tutor.ts:359-369`).
- It returns `type: "correction"` when `isCorrectionResponse` matches (raw starts with one of: "almost", "close", "good try", "not quite", "small fix", "nice try", "great effort" — or contains `Try again:` style lines / `correct form` / `instead of` phrases) (`tutor.ts:126-134`, `285-295`).
- Otherwise `type: "normal"`: Spanish = lines before the first line starting with `(`, English = the parenthesized lines (`tutor.ts:297-327`).
- A leading `[NARRATOR] ...` line is extracted into `narratorText` and stripped (`tutor.ts:125`, `349-357`).
- `buildTutorSpeechText`: correction with a quoted Spanish target → speaks `correctionTarget`; else `parsed.spanishText`; else **falls back to the full raw text minus the narrator line** (`tutor.ts:393-403`). For a correction with no quoted segment this returns the full *English* explanation — that is a known bug fixed later by plan 004. **Characterize it as-is here.**

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `npm install`            | exit 0              |
| Typecheck | `npx tsc --noEmit`       | exit 0, no output   |
| Lint      | `npm run lint`           | "No ESLint warnings or errors" |
| Tests     | `npm test`               | all pass (exists after Step 1) |

## Scope

**In scope** (the only files you should create or modify):
- `package.json` (add `test` script + `vitest` devDependency), `package-lock.json`
- `vitest.config.ts` (create)
- `src/lib/tutor.test.ts` (create)
- `src/lib/exchanges.test.ts` (create)
- `.github/workflows/ci.yml` (create)

**Out of scope** (do NOT touch, even though they look related):
- `src/lib/tutor.ts`, `src/lib/exchanges.ts`, or ANY other `src/` file — this plan **characterizes** current behavior; it must not change it. If a test "finds a bug", write the assertion to match actual behavior and add a `// KNOWN QUIRK:` comment.
- `tsconfig.json` — avoid global test types; import `describe/it/expect` from `vitest` explicitly in test files instead.
- React components/hooks — no component testing in this plan (no jsdom, no testing-library).

## Git workflow

- Branch: `advisor/001-verification-baseline`
- Commit style: short lowercase imperative, matching repo history (e.g. `add vitest harness and parser characterization tests`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add Vitest and the test script

`npm install --save-dev vitest`. Add to `package.json` scripts: `"test": "vitest run"` and `"test:watch": "vitest"`. Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

**Verify**: `npm test` → runs, reports "no test files found" (exit code may be 1 — acceptable at this step only). `npx tsc --noEmit` → exit 0.

### Step 2: Characterization tests for `parseTutorResponse`

Create `src/lib/tutor.test.ts` importing `{ parseTutorResponse, buildTutorSpeechText }` from `./tutor` and `{ describe, it, expect }` from `vitest`. Cover at minimum these named cases (assert `type` plus the populated fields for each):

1. **normal turn**: `"¿Ya sabe qué quiere tomar?"` + newline + `(Do you know what you'd like to drink?)` → `type: "normal"`, `spanishText` without surrounding quotes, `englishText` without parentheses.
2. **normal with curly quotes**: Spanish line wrapped in `“...”` → quotes stripped.
3. **normal with narrator**: `[NARRATOR] Carlos leans forward.` first line → `narratorText: "Carlos leans forward."`, narrator absent from `spanishText`.
4. **two Spanish lines before the English line** → joined with a space into `spanishText`.
5. **correction (canonical)**: `You meant to say "Me ducho y después tomo un café."` + newline + `Try again: "Me ducho y después tomo un café."` → `type: "correction"`, `correctionTarget` = the quoted sentence, `retryPrompt` starting `Try again:`.
6. **correction via starter word**: raw starting `Almost! ...` with a quoted fix → `type: "correction"`.
7. **correction with NO quoted segment**: e.g. `Not quite — you need the reflexive form.\nTry again: say it one more time.` → `type: "correction"`, `correctionTarget` is `undefined`.
8. **correction with no retry line** → `retryPrompt` falls back to `"Try again: say it one more time."` (see `tutor.ts:246-249`).
9. **completion**: Spanish line + `(English)` + `[SCENARIO_COMPLETE]` + `Session summary: You practiced ordering food.` → `type: "completion"`, `summaryText: "You practiced ordering food."`, `spanishText` populated.
10. **completion with no preceding dialogue**: raw is just the marker + summary → `spanishText` is `""` or undefined-ish; assert actual value.
11. **plain text, no parentheses, no markers** → `type: "normal"`, `englishText: ""`.

Then `buildTutorSpeechText` cases:

12. correction with `correctionTarget` → returns exactly the target.
13. normal → returns `spanishText`.
14. **correction WITHOUT `correctionTarget`** → returns the full raw English text. Mark: `// KNOWN QUIRK: speaks English; fixed by plan 004 — update this assertion then.`
15. narrator-only stripping: normal response whose parse produced empty `spanishText` (construct via a raw that is only a narrator line) → returns raw minus narrator line.

For each case, first run it and inspect the real output (e.g. `npx vitest run` with a temporary `console.log`, or write the expected value, run, and correct to actual). **The source of truth is the code's behavior, not this plan's prose.**

**Verify**: `npm test` → all tutor tests pass.

### Step 3: Characterization tests for `groupIntoExchanges`

Create `src/lib/exchanges.test.ts`. Build `Message` objects with minimal fields (`id`, `role`, `type`, `timestamp`, `content`). Cases:

1. opening tutor `normal` + user reply → 1 exchange with `tutorMessage` + `userMessage`.
2. tutor normal → user → tutor correction → user retry → tutor normal → 2 exchanges; first has `correction` + `userRetry`.
3. tutor `completion` message starts its own exchange.
4. **double correction**: tutor normal → user → correction A → retry 1 → correction B → retry 2. Assert actual behavior: `correction` is B (A overwritten), retry 2 appears nowhere in the result. Mark: `// KNOWN QUIRK: second retry dropped from UI; candidate fix tracked in plans/README.md (finding #7).`
5. user message arriving before any tutor message → skipped (no exchange).

**Verify**: `npm test` → all pass.

### Step 4: CI workflow

Create `.github/workflows/ci.yml`: trigger on `push` to `main` and `pull_request`; single job on `ubuntu-latest`; steps: checkout, setup-node (node 22, npm cache), `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm test`.

**Verify**: `npx tsc --noEmit` → exit 0 (the workflow file itself isn't locally executable; YAML-lint it by eye against the structure above).

### Step 5: Human baseline snapshot (maintainer only — agent skips)

After all agent steps pass, the maintainer records the "before" metrics row in
`notes/baseline-snapshot.md` (local, gitignored). Record: commit SHA, `npm test`
pass count, runtime, audit count, and every `// KNOWN QUIRK` from the new tests.
Optionally start `notes/scorecard-pre-005.md` before plan 005.

See `plans/LEARNING.md` → "Human-in-the-loop checklist".

## Test plan

This plan IS the test plan — it creates the suite. Expected end state: ~16+ passing tests in 2 files, runnable via `npm test` in under 30 seconds, no network calls (never import or invoke `sendToTutor` / `lookupWord` / anything touching `createOpenAIClient` at call level — module-level import of `./tutor` is fine since the OpenAI client is only constructed inside functions).

## Done criteria

- [ ] `npm test` exits 0 with ≥16 tests passing across `src/lib/tutor.test.ts` and `src/lib/exchanges.test.ts`
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint` exits 0
- [ ] No `src/` non-test file modified (`git status` shows only the in-scope files)
- [ ] `.github/workflows/ci.yml` exists and runs typecheck + lint + test
- [ ] `plans/README.md` status row updated
- [ ] Maintainer filled `notes/baseline-snapshot.md` from template (human; not an agent gate)

## STOP conditions

Stop and report back (do not improvise) if:

- `src/lib/tutor.ts` or `src/lib/exchanges.ts` no longer match the excerpts in "Current state" (drift — plan 005 may have landed first; the characterization targets no longer exist).
- You feel compelled to change a `src/` non-test file to make a test pass — that means the test is wrong, not the code; if you can't express actual behavior in an assertion, stop.
- Vitest cannot resolve the `@/` alias after the config in Step 1 — report rather than restructuring imports.

## Maintenance notes

- Plans 004 and 005 will intentionally break the `// KNOWN QUIRK` assertions; they each say so and update them. Anyone else seeing those tests fail should treat it as a real regression.
- When plan 005 (structured outputs) replaces `parseTutorResponse`, most of `tutor.test.ts` is deleted with it — that's expected; the harness, exchanges tests, and CI remain.
- Reviewer focus: confirm assertions encode *actual* behavior (run the suite at the parent commit of the test change — it must pass there too).
