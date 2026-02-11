# AGENTS.md - SpeakFluid

## Read First
1. `docs/agents/COMMON.md`
2. `docs/agents/CODEX.md`
3. `SPEAKFLUID_SPEC.md` sections relevant to the task

## Project Snapshot
- SpeakFluid is a voice-first Spanish tutor MVP.
- Two-provider architecture:
  - OpenAI for STT (`gpt-4o-transcribe`) and tutor LLM (`gpt-4o-mini`)
  - ElevenLabs for TTS (`eleven_flash_v2_5`)
- No backend/database/auth for MVP.
- Keys are stored in browser `localStorage`.

## Task Priorities
1. Preserve core constraints from `docs/agents/COMMON.md`.
2. Keep behavior deterministic and resilient (especially audio state transitions).
3. Keep diffs narrow and avoid unnecessary abstractions.
4. Keep docs synchronized with behavior changes.

## High-Risk Areas
- Audio state machine overlap bugs.
- Tutor response format drift that breaks parsing.
- Accidental scope creep (backend, gamification, multi-language support in MVP).

## Completion Requirements
- Confirm implemented behavior matches current architecture decisions.
- Report validation steps run (or explicitly state what was not run).
