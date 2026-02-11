# Codex Overlay

## Working Style
- Execute directly; avoid long speculative plans.
- Keep edits minimal and local to the request.
- Prefer deterministic changes over broad refactors.

## Practical Rules
- Inspect before editing: use fast search (`rg`) and read only needed files.
- When touching tutor behavior, keep prompt, parser, and UI rendering in sync.
- When touching audio flow, verify state transitions cannot overlap.
- Avoid introducing new dependencies unless the user asks.

## Final Gate
- Confirm no drift against `docs/agents/COMMON.md`.
- Summarize what changed and what was not verified.
