# Plan 004: Enforce the TTS contract — speak completion lines, never speak English

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9f166b5..HEAD -- src/hooks/useConversation.ts src/lib/tutor.ts src/lib/tutor.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-verification-baseline.md (updates its characterization tests); run after plans/003-stop-tts-on-unmount.md to avoid merge friction in the same file
- **Category**: bug
- **Planned at**: commit `9f166b5`, 2026-06-12

## Why this matters

Two violations of the project's TTS contract (`docs/agents/COMMON.md` "TTS Contract" + `SPEAKFLUID_SPEC.md` §5):

1. **The completion line is never spoken.** The spec's response-type table says completion turns speak the "Spanish line only (if any)", but both pipelines skip TTS entirely when `parsed.type === "completion"` — the tutor's in-character goodbye is silent, an abrupt end to a voice-first session.
2. **English can be spoken in the Spanish voice.** `buildTutorSpeechText` falls back to the full raw response when a correction has no quoted Spanish (`correctionTarget` undefined). Corrections are written almost entirely in English by design, so on this drift path the ElevenLabs Spanish voice reads out an English grammar explanation. The contract says: correction turns speak only the corrected Spanish phrase.

After this plan: completion Spanish lines are spoken; `buildTutorSpeechText` returns Spanish-or-empty, and callers skip TTS on empty.

## Current state

- `src/lib/tutor.ts` — `buildTutorSpeechText` at lines 393–403:

```ts
export function buildTutorSpeechText(raw: string, parsed: ParsedTutorResponse): string {
  if (parsed.type === "correction" && parsed.correctionTarget) {
    return parsed.correctionTarget;
  }

  if (parsed.spanishText?.trim()) {
    return parsed.spanishText.trim();
  }

  return stripNarratorLine(raw);   // ← BUG: full raw text, English included
}
```

Note: a correction never has `spanishText` (the correction branch of `parseTutorResponse` at `tutor.ts:371-384` doesn't set it), so a no-quote correction always reaches the raw fallback.

- `src/hooks/useConversation.ts` — two near-identical TTS blocks:

```ts
// src/hooks/useConversation.ts:150-159 (sendUserMessage)
if (withTTS && parsed.type !== "completion") {
  setAudioState(AudioState.SPEAKING);
  try {
    const ttsText = buildTutorSpeechText(rawResponse, parsed);
    await playTTS(ttsText, keys.elevenlabs);
  } catch {
    // TTS failure is non-critical — text is already displayed
  }
}
```

```ts
// src/hooks/useConversation.ts:221-229 (handleRecordedAudio) — same shape,
// without the `withTTS &&` condition
if (parsed.type !== "completion") { ... }
```

- `src/lib/tutor.test.ts` — exists if plan 001 landed; contains a `// KNOWN QUIRK` assertion (case 14) that a no-target correction speaks the raw English. This plan flips that assertion.
- Spec/docs already state the desired behavior — **no doc changes needed**; this aligns code to spec (`SPEAKFLUID_SPEC.md:160-169`, `docs/agents/COMMON.md` TTS Contract paragraph).

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0              |
| Lint      | `npm run lint`     | exit 0              |
| Tests     | `npm test`         | all pass            |
| Dev server| `npm run dev`      | serves on :3000 (manual verify) |

## Scope

**In scope** (the only files you should modify):
- `src/lib/tutor.ts` — `buildTutorSpeechText` only
- `src/hooks/useConversation.ts` — the two TTS blocks only
- `src/lib/tutor.test.ts` — update the flipped characterization + add regression tests

**Out of scope** (do NOT touch, even though they look related):
- `parseTutorResponse` and all parser helpers in `tutor.ts` — parser behavior is pinned by plan 001's tests and replaced wholesale by plan 005.
- The session page's 1-second completion-overlay timer (`src/app/session/[scenarioId]/page.tsx:131-136`) — the overlay appearing while the goodbye audio finishes is acceptable; do not re-sequence it.
- `SPEAKFLUID_SPEC.md` / `docs/agents/COMMON.md` — already correct.
- Consolidating the duplicated pipelines (separate finding; keep the two blocks parallel-but-identical here).

## Git workflow

- Branch: `advisor/004-tts-contract-fixes`
- Commit style: short lowercase imperative (e.g. `speak completion line and never speak english in tts`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Make `buildTutorSpeechText` return Spanish-or-empty

Replace the final fallback in `src/lib/tutor.ts:393-403`. New behavior, exactly:

- correction with `correctionTarget` → return the target (unchanged);
- correction **without** `correctionTarget` → return `""` (never speak English);
- any type with non-empty `parsed.spanishText` → return it trimmed (unchanged — this now covers completion turns too);
- otherwise → return `""` (replaces the `stripNarratorLine(raw)` fallback).

The `raw` parameter becomes unused. Remove it and change the signature to `buildTutorSpeechText(parsed: ParsedTutorResponse): string`, updating the two call sites in `useConversation.ts` and any test imports. (Strict TS will catch any missed caller.)

**Verify**: `npx tsc --noEmit` → exit 0. `npm test` → the plan-001 KNOWN-QUIRK assertion for case 14 now FAILS (expected at this step).

### Step 2: Update the TTS gates in both pipelines

In `src/hooks/useConversation.ts`, change both blocks (lines ~150-159 and ~221-229) from gating on `parsed.type !== "completion"` to gating on having something to say. Target shape (voice pipeline; text pipeline keeps its additional `withTTS &&`):

```ts
const ttsText = buildTutorSpeechText(parsed);
if (ttsText) {
  setAudioState(AudioState.SPEAKING);
  try {
    await playTTS(ttsText, keys.elevenlabs);
  } catch {
    // TTS failure is non-critical — text is already displayed
  }
}
```

Keep the existing comment style; the `finally { setAudioState(AudioState.IDLE) }` wrappers already present in both functions remain untouched.

**Verify**: `npx tsc --noEmit` → exit 0; `npm run lint` → exit 0.

### Step 3: Update tests

In `src/lib/tutor.test.ts`:

1. Flip the case-14 KNOWN QUIRK: correction without `correctionTarget` → expect `""` ; delete the QUIRK comment.
2. Update all `buildTutorSpeechText` calls to the new single-argument signature.
3. Add regression cases:
   - completion parse with a Spanish line → `buildTutorSpeechText` returns that Spanish line (this is the line that will now be spoken);
   - completion parse with no dialogue before the marker → returns `""`;
   - assert the returned string never contains `[SCENARIO_COMPLETE]`, `(`-style English, or `[NARRATOR]` for: a normal turn with narrator, a completion turn, and a no-quote correction.

**Verify**: `npm test` → all pass, zero skips.

### Step 4: Manual smoke (voice path)

`npm run dev`, run a short scenario to completion (the "Meeting Someone New" scenario targets 8 exchanges; you can also type brief answers to move fast, then switch to mic for the last turn). **Expected**: the final in-character Spanish goodbye is spoken aloud; the completion overlay still appears; no English is ever spoken. If you cannot run a browser or lack API keys, report this step as not run.

## Test plan

Covered in Step 3 — flipped characterization plus three named regression cases in `src/lib/tutor.test.ts`, following the structure plan 001 established in that file.

## Done criteria

- [ ] `npm test` exits 0; includes the new completion-speech and empty-string-correction cases
- [ ] `grep -n "stripNarratorLine(raw)" src/lib/tutor.ts` → only inside `parseTutorResponse` (not in `buildTutorSpeechText`)
- [ ] `grep -n 'type !== "completion"' src/hooks/useConversation.ts` → no matches
- [ ] `npx tsc --noEmit` and `npm run lint` exit 0
- [ ] Only the three in-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 001 has not landed (no `src/lib/tutor.test.ts`) — execute 001 first or report.
- The excerpts in "Current state" don't match (plan 005's parser replacement may have landed; this plan is then partially obsolete — report which half).
- Making completion turns speak requires touching the session page's phase timer to feel right — that's a product call, report instead.

## Maintenance notes

- Plan 005 (structured outputs) rebuilds `buildTutorSpeechText` on top of explicit speech segments; the "Spanish-or-empty, callers skip on empty" contract established here must survive that rewrite.
- Reviewer focus: both pipelines (`sendUserMessage` AND `handleRecordedAudio`) got the same gate change — the duplication makes one-sided edits easy.
- Deferred: a completion turn whose parse yields no Spanish stays silent by design; if the prompt is later changed to guarantee a final Spanish line, no code change is needed here.
