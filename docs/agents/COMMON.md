# SpeakFluid Agent Core Guide

## Goal
Ship a reliable MVP for guided spoken Spanish practice. Prioritize correctness and stability over extra features.

## Authoritative Sources
- `AGENTS.md` for Codex-specific execution flow.
- `CLAUDE.md` for Claude Code entrypoint and imports.
- `docs/agents/COMMON.md` (this file) for shared constraints.
- `SPEAKFLUID_SPEC.md` for product behavior and architecture details.

If instructions conflict, prefer model-specific root file (`AGENTS.md` or `CLAUDE.md`), then this file, then the spec.

## Non-Negotiable Product Constraints
- Stack: Next.js App Router + TypeScript strict mode + Tailwind.
- Client-side only for MVP. No backend proxy, no DB, no auth system.
- API keys are user-provided and stored in `localStorage`:
  - OpenAI key for STT + tutor LLM
  - ElevenLabs key for TTS
- STT: OpenAI `gpt-4o-transcribe`.
- Tutor LLM: OpenAI `gpt-4o-mini`.
- TTS: ElevenLabs `eleven_flash_v2_5` with a Latin American Spanish voice.
- Audio interaction is push-to-talk only. Do not add VAD or continuous listening.
- Never allow overlapping audio states:
  - no recording while TTS plays
  - no concurrent TTS playback
- Keep tutor responses short and structured (Spanish + English translation, correction flow, completion marker).

## Required Build Sequence
1. Static shell/routes/design tokens/scenario data.
2. API key entry, validation, persistence, and route guards.
3. Text conversation loop and robust response parsing.
4. Voice pipeline: record -> STT -> tutor -> TTS -> playback.
5. Mobile polish, error handling, and edge cases.

Do not skip phases unless the user explicitly asks.

## Critical Contracts

### Audio State Machine
Use and enforce one state machine:
`IDLE -> RECORDING -> TRANSCRIBING -> THINKING -> SPEAKING -> IDLE`

Recovery rule: any unrecoverable API/audio error must return to `IDLE` and show user-visible feedback.

### Tutor Output Contract
Support three response types:
- `normal`: Spanish line + English translation
- `correction`: concise correction + retry prompt
- `completion`: includes `[SCENARIO_COMPLETE]` and summary text

Parser should be strict enough for UI rendering but tolerant to minor format drift.

### TTS Contract
Send full tutor message text (Spanish + English) in a single TTS request. Create one blob URL per response and always revoke URLs after playback.

## Coding Standards
- Keep components focused and split complex logic into hooks.
- Use descriptive names (`audioState`, `conversationHistory`, etc.).
- Handle all caught errors explicitly; avoid silent failures.
- Add comments only where logic is non-obvious.

## Completion Checklist
- Changes align with non-negotiable constraints above.
- Any changed behavior is reflected in related docs.
- If runnable scripts exist, run relevant checks before finishing.
- If checks cannot run, state exactly what was not verified.
