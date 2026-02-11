# Claude Code Overlay

## Working Style
- Keep responses concise and implementation-focused.
- Use short progress updates during multi-step tasks.
- Make the smallest change that fully solves the request.

## Practical Rules
- Prefer editing existing files over introducing parallel alternatives.
- Keep docs concise; large repeated instructions reduce signal quality.
- If requirements conflict, call out the conflict and follow source precedence from `docs/agents/COMMON.md`.

## Final Gate
- Verify modified docs remain internally consistent.
- Explicitly note any assumptions or unverified checks.
