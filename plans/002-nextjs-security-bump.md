# Plan 002: Patch Next.js advisories and drop the unused ElevenLabs SDK

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9f166b5..HEAD -- package.json package-lock.json`
> If these changed since this plan was written, re-run `npm audit` and compare
> against "Current state" before proceeding; if the advisories are already
> resolved, mark this plan DONE-by-drift in `plans/README.md` and stop.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (but if plan 001 has landed, run `npm test` at each verify point too)
- **Category**: security
- **Planned at**: commit `9f166b5`, 2026-06-12

## Why this matters

`npm audit --omit=dev` at commit `9f166b5` reports 3 vulnerabilities against the production site (`speakfluid.org`, auto-deployed from `main` via Vercel):

- **next 15.5.12** — 1 HIGH (HTTP request smuggling in rewrites, GHSA-ggv3-7p47-pfv8) plus a long list of moderates (cache poisoning of RSC responses, XSS via CSP nonces, image-API DoS, middleware bypass). The app is App Router on Vercel, so the RSC/cache-poisoning class is plausibly reachable even though the app defines no middleware or rewrites. Patched versions exist within the `^15.1.0` semver range — this is a lockfile-level fix.
- **postcss < 8.5.10** (moderate) — transitive via `next`; resolved by the same bump.
- **ws 8.0.0–8.20.0** (moderate, uninitialized memory disclosure) — transitive via `@elevenlabs/elevenlabs-js`. That SDK is **declared in `dependencies` but never imported anywhere in `src/`** (both ElevenLabs call sites use raw `fetch`: `src/lib/tts.ts:10` and `src/lib/elevenlabs.ts:4`). Removing the dead dependency removes the advisory and shrinks installs.

## Current state

- `package.json:11-17` — `dependencies` contains `"@elevenlabs/elevenlabs-js": "^2.35.0"` and `"next": "^15.1.0"`. Installed `next` resolves to `15.5.12` (check with `node -e "console.log(require('./node_modules/next/package.json').version)"`).
- `src/lib/tts.ts` and `src/lib/elevenlabs.ts` — plain `fetch` calls to `https://api.elevenlabs.io/...`; no SDK import. Confirm with the grep in Step 1.
- No tests exist unless plan 001 has landed (check `package.json` for a `test` script).

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Install   | `npm install`                 | exit 0              |
| Audit     | `npm audit --omit=dev`        | 0 vulnerabilities (after this plan) |
| Typecheck | `npx tsc --noEmit`            | exit 0              |
| Lint      | `npm run lint`                | exit 0              |
| Build     | `npm run build`               | exit 0, "Compiled successfully" |
| Tests     | `npm test` (only if plan 001 landed) | all pass     |

## Scope

**In scope** (the only files you should modify):
- `package.json`
- `package-lock.json`

**Out of scope** (do NOT touch, even though they look related):
- Any `src/` file — no code changes are needed; if the Next bump forces one, that's a STOP condition.
- `next.config.js`, `tsconfig.json`, `.eslintrc.json`.
- Upgrading `openai` (v4 → v5+) or `next` across a major version (15 → 16) — explicitly rejected by the audit as not worth the blast radius now.

## Git workflow

- Branch: `advisor/002-nextjs-security-bump`
- Commit style: short lowercase imperative (e.g. `bump next to patched 15.x and remove unused elevenlabs sdk`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm the ElevenLabs SDK is still unused

**Verify**: `grep -rn "@elevenlabs" src/` → no matches. (If there ARE matches, the SDK got adopted since this plan was written — STOP, and do only the Next bump portion of this plan.)

### Step 2: Remove the unused SDK

`npm uninstall @elevenlabs/elevenlabs-js`

**Verify**: `npm audit --omit=dev` → the `ws` advisory is gone. `npx tsc --noEmit` → exit 0.

### Step 3: Bump Next.js within v15

`npm install next@^15 eslint-config-next@^15` (pulls the latest patched 15.x for both; keeping them in lockstep avoids lint plugin mismatch).

**Verify**: `npm audit --omit=dev` → "found 0 vulnerabilities". `node -e "console.log(require('./node_modules/next/package.json').version)"` → a 15.x version greater than 15.5.12.

### Step 4: Full verification pass

Run, in order: `npx tsc --noEmit` → exit 0; `npm run lint` → exit 0; `npm run build` → exit 0; `npm test` if the script exists → all pass.

**Verify**: all of the above; `git status` shows only `package.json` and `package-lock.json` modified.

## Test plan

No new tests — this is a dependency-only change. The gate is the full verification pass in Step 4 plus a manual smoke if a dev wants one (`npm run dev`, load `/`, enter keys page renders).

## Done criteria

- [ ] `npm audit --omit=dev` exits 0 with 0 vulnerabilities
- [ ] `@elevenlabs/elevenlabs-js` absent from `package.json`
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` and `npm run lint` exit 0
- [ ] Only `package.json` + `package-lock.json` modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The latest 15.x introduces a build or type error in this app — report the exact error; do not patch `src/` to accommodate it.
- `npm audit` still reports a HIGH advisory after Step 3 (a new advisory may have been published since planning — report it; do not jump to Next 16).
- Step 1's grep finds SDK usage in `src/`.

## Maintenance notes

- Future TTS work (v2 todo #4, mixed-language segments) might *want* the ElevenLabs SDK back; reinstalling then is fine — what's wrong today is carrying it unused.
- Dependabot/`npm audit` should be re-run periodically; consider enabling GitHub Dependabot alerts on the repo (out of scope here).
- Reviewer focus: the lockfile diff should show only `next`/`eslint-config-next` family bumps and the elevenlabs/ws removals.
