# Plan 003: Stop TTS playback when the session unmounts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9f166b5..HEAD -- src/hooks/useConversation.ts`
> If the file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (plan 001 recommended first so the typecheck/lint/test gate exists)
- **Category**: bug
- **Planned at**: commit `9f166b5`, 2026-06-12

## Why this matters

The project's top non-negotiable (`docs/agents/COMMON.md`) is "Never allow overlapping audio states." But TTS playback survives navigation: `useConversation` holds the playing `HTMLAudioElement` in a ref with **no unmount cleanup**, so if the user leaves the session mid-`SPEAKING` (the always-visible back arrow in `ScenarioHeader` links to `/scenarios`, or browser back), the tutor's voice keeps talking over the scenarios menu — and could overlap a new session's opening TTS. The blob URL is also only revoked by the `onended`/`onerror` handlers, which still fire eventually, but pausing on unmount is the correct fix for both.

## Current state

- `src/hooks/useConversation.ts` — owns the audio element ref and the `playTTS` helper. There is **no** `useEffect` anywhere in this hook (verify: `grep -n "useEffect" src/hooks/useConversation.ts` → no matches; the import on line 3 is `useState, useCallback, useRef` only).

Excerpts at commit `9f166b5`:

```ts
// src/hooks/useConversation.ts:22-23
// Audio element ref for TTS playback
const audioElRef = useRef<HTMLAudioElement | null>(null);
```

```ts
// src/hooks/useConversation.ts:59-81 (playTTS)
async function playTTS(text: string, apiKey: string): Promise<void> {
  const blobUrl = await synthesizeSpeech(text, apiKey);
  return new Promise((resolve, reject) => {
    const audio = new Audio(blobUrl);
    audioElRef.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(blobUrl);
      audioElRef.current = null;
      resolve();
    };
    // ... onerror and play().catch() follow the same revoke-and-clear pattern
  });
}
```

- Navigation that triggers the bug: `src/components/ScenarioHeader.tsx:19-22` — `<Link href="/scenarios">` back arrow, rendered during the entire conversation, including while `audioState === SPEAKING`.
- Repo conventions: hooks use `useCallback` for exported functions; cleanup-on-unmount precedent exists in `src/hooks/useAudioRecorder.ts:89-93` (a `useEffect` returning `cleanupMedia`). Match that pattern.

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0              |
| Lint      | `npm run lint`     | exit 0              |
| Tests     | `npm test` (if plan 001 landed) | all pass |
| Dev server| `npm run dev`      | serves on :3000 (for manual verify) |

## Scope

**In scope** (the only file you should modify):
- `src/hooks/useConversation.ts`

**Out of scope** (do NOT touch, even though they look related):
- `src/hooks/useAudioPlayer.ts` / `src/hooks/useTTS.ts` — dead code (zero importers); do not "adopt" them as part of this fix.
- `src/components/ScenarioHeader.tsx` — do not block or intercept navigation; the fix is cleanup, not prevention.
- `src/hooks/useAudioRecorder.ts` — its cleanup already works.

## Git workflow

- Branch: `advisor/003-stop-tts-on-unmount`
- Commit style: short lowercase imperative (e.g. `stop tts playback when session unmounts`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Track the active blob URL and add an unmount cleanup effect

In `src/hooks/useConversation.ts`:

1. Add `useEffect` to the existing react import on line 3.
2. Next to `audioElRef` (line 23), add a second ref: `const blobUrlRef = useRef<string | null>(null);`
3. In `playTTS`, set `blobUrlRef.current = blobUrl;` right after `synthesizeSpeech` resolves, and set it back to `null` in each of the three places that currently call `URL.revokeObjectURL(blobUrl)` (onended, onerror, play().catch).
4. Add an unmount-only cleanup effect (place it after the refs, before `addTutorMessage`):

```ts
// Stop any in-flight TTS playback if the session unmounts mid-speech.
useEffect(() => {
  return () => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };
}, []);
```

Note: pausing prevents `onended` from firing, so the pending `playTTS` promise never settles — that is fine (the awaiting code lives in the same unmounted component tree; no state updates will run). Do not try to reject the promise; that would surface an error toast race during navigation.

**Verify**: `npx tsc --noEmit` → exit 0; `npm run lint` → exit 0.

### Step 2: Manual verification

1. `npm run dev`, open `http://localhost:3000`, enter valid API keys (operator-provided; do NOT commit keys anywhere).
2. Start any scenario, tap "Begin Conversation", and while the opening line is being spoken (`SPEAKING` state, speaker icon on the mic button), click the back arrow in the header.
3. **Expected**: audio stops immediately; the scenarios page is silent.
4. Re-enter the scenario and complete one full voice exchange to confirm normal playback still works end to end.

**Verify**: steps 2–4 behave as described. If you cannot run a browser or lack API keys, state exactly that in your report — this step is then explicitly unverified.

## Test plan

No automated test — `HTMLAudioElement` playback isn't meaningfully testable in the node-environment Vitest setup from plan 001, and a jsdom/mock harness for this one effect isn't worth the weight. The manual procedure in Step 2 is the test. (If plan 001 landed, still run `npm test` to confirm nothing else broke.)

## Done criteria

- [ ] `grep -n "useEffect" src/hooks/useConversation.ts` shows the new cleanup effect
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0 (if the script exists)
- [ ] Only `src/hooks/useConversation.ts` modified (`git status`)
- [ ] Manual check from Step 2 passed, or explicitly reported as not run
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `useConversation.ts` no longer matches the excerpts (e.g. plan 005's refactor landed first and `playTTS` moved or changed shape).
- The fix seems to require touching `ScenarioHeader`, the session page, or the dead audio hooks.
- After the change, normal playback (Step 2.4) is broken in manual testing.

## Maintenance notes

- Plan 005 (structured outputs) and any future TTS-streaming work will touch `playTTS`; the cleanup effect must keep pausing whatever audio handle replaces it.
- Reviewer focus: confirm the cleanup effect has an empty dependency array (unmount-only) and that no state setters run inside it.
- Deferred: `initialize()` can in principle be called while a previous opening TTS is still playing (rapid re-Begin); today the intro phase gates this. Not addressed here.
