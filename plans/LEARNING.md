# Learning Companion — understand the work while it happens

This doc pairs with the plans in this folder. The plans are written for an AI
executor; this one is written for **you**. The idea: for plans 001–005, your
agent does the typing and you do the understanding. For plan 006 (the eval
pipeline), you flip it — you do the building, the plan becomes your guide.

How to use it: before your agent runs a plan, read that plan's section here
(5–10 minutes). After the agent finishes, do the "look at the diff" exercise.
You'll learn more from reading one real diff of your own project than from
hours of tutorials, because you already know what the app *does* — you're just
connecting it to *how*.

One skill to carry through all of it:

```bash
git diff main..advisor/001-verification-baseline
```

This shows everything a branch changed. Lines starting with `-` were removed,
`+` were added. Reading diffs is the single highest-value habit for working
with coding agents — you're the reviewer now, and reviewers read diffs.

---

## Plan 001 — Tests (read this one most carefully)

### What a test actually is

A test is just a tiny program that calls your real code with a known input and
checks the output. That's all. This:

```ts
it("parses a normal tutor turn", () => {
  const result = parseTutorResponse('"¿Cómo estás?"\n(How are you?)');
  expect(result.type).toBe("normal");
  expect(result.spanishText).toBe("¿Cómo estás?");
});
```

reads as: *call `parseTutorResponse` with this exact string; if `type` isn't
`"normal"`, scream.* `npm test` runs hundreds of these in seconds. The value
isn't catching bugs today — it's that **next month, when you or an agent
changes `tutor.ts`, the suite instantly tells you what broke**. Tests are a
tripwire around behavior you care about.

### The weird part: we're writing tests for buggy code

Plan 001 uses **characterization tests** — tests that pin down what the code
does *right now*, including its bugs. Example: we know `buildTutorSpeechText`
can return English text (that's a bug, plan 004 fixes it). The plan still
writes a test asserting it returns English.

Why on earth? Because before you change something, you want a complete picture
of current behavior. Then when plan 004 lands, exactly one test flips — and
that flip is *proof* the fix did what it claimed and nothing else. Without the
baseline, a fix is just vibes. This is also literally item #0 of your own
v2_todo: "get a basis for future improvement."

### Words you'll see

- **Vitest** — the test runner (the program that finds `*.test.ts` files and
  executes them). Jest is the older, similar one.
- **Pure function** — a function whose output depends only on its inputs: no
  network, no clock, no randomness. `parseTutorResponse(string) → object` is
  pure. Pure functions are trivially testable; that's why the plan tests the
  parser but NOT `sendToTutor` (which calls OpenAI — network, money, randomness).
- **CI (continuous integration)** — a robot (GitHub Actions) that runs
  `tsc + lint + test` on every push. It's the "did I break anything?" check
  that runs even when you forget to.

### After the agent finishes — your exercise

1. Open `src/lib/tutor.test.ts`. Pick one test. Find the function it calls in
   `src/lib/tutor.ts` and trace why the expected output is what it is.
2. Sabotage check: change one expected value in a test to something wrong,
   run `npm test`, watch it fail, read the failure message, undo. Now you know
   what a real regression will look like.
3. Find the `// KNOWN QUIRK` comments. These are the bugs-pinned-on-purpose.

---

## Plan 002 — Dependencies (short and important)

Your app is maybe 2,000 lines of your code sitting on top of ~hundreds of
thousands of lines of other people's code in `node_modules`. Three ideas:

- **Semver** (semantic versioning): versions are `MAJOR.MINOR.PATCH`
  (e.g. `15.5.12`). The `^15.1.0` in package.json means "any 15.x, at least
  15.1.0" — minor/patch updates are supposed to be safe; major (15→16) can
  break you. That's why the plan bumps *within* 15 and explicitly refuses 16.
- **`npm audit`** checks your installed versions against a public database of
  known vulnerabilities. Your Next.js version had a "HIGH" entry. This isn't
  hypothetical hygiene — your site is live at speakfluid.org.
- **Transitive dependencies**: you never installed `ws`, but the ElevenLabs
  SDK depends on it, so you have it — and its vulnerability. Best part of this
  plan: the ElevenLabs SDK turned out to be **completely unused** (your code
  calls their API with plain `fetch`). Deleting a dependency you don't use is
  the cheapest security fix that exists.

**Exercise**: before the agent runs it, run `npm audit --omit=dev` yourself
and read one advisory link. After: run it again and see zero.

---

## Plan 003 — The unmount bug (a React mental model in one bug)

The bug: the tutor's voice keeps talking after you leave the session page.
Understanding *why* teaches you three React concepts at once:

- **Mounting/unmounting**: when you navigate to the session page, React
  "mounts" the component (builds it); when you navigate away it "unmounts" it
  (tears it down). But the `Audio` object playing TTS isn't part of React's
  world — it's a browser object the code created. React tears down the page;
  the audio object just... keeps going. Anything you start outside React
  (audio, timers, network) you must stop yourself.
- **`useRef`**: a small box a component uses to hold onto something between
  renders without redrawing the screen — here, the handle to the playing audio
  (`audioElRef`). The bug is that the box was filled but nobody ever emptied it.
- **Cleanup functions**: `useEffect(() => { return () => {...} }, [])` — the
  returned function runs exactly once, at unmount. That's React's official
  "last chance to turn things off" hook. The fix is ~10 lines: on unmount,
  pause the audio and release the blob URL.

Bonus concept — **blob URLs**: TTS audio arrives as bytes; the code wraps them
in a temporary in-memory URL (`URL.createObjectURL`) so an audio element can
play it. Each one holds memory until you call `revokeObjectURL`. That's why
the codebase is obsessive about revoking them — it's a memory leak otherwise.

**Exercise**: reproduce the bug *before* the fix (start a scenario, click the
back arrow while the tutor is talking). Then after the fix, do it again. You
just did manual QA with a before/after, which is exactly what the plan's
verification step asks of the agent.

---

## Plan 004 — Contracts

A **contract** is a promise one part of a system makes to another, written
down. Yours (in `docs/agents/COMMON.md`): *only Spanish is ever spoken aloud;
English is visual-only.* Plan 004 exists because the code breaks that promise
in two places — completion lines are never spoken (spec says they should be),
and a malformed correction can cause the Spanish voice to read out an English
paragraph.

The interesting design move to watch for in the diff: instead of patching the
bad fallback, the fix changes the *contract of the function itself* —
`buildTutorSpeechText` now returns "Spanish, or empty string", and callers
skip TTS on empty. A function with a crisp one-sentence contract ("returns
Spanish or nothing") is easy to test, easy to trust, hard to misuse. Vague
contracts ("returns something speakable, usually") are where bugs live.

**Exercise**: after it lands, find the flipped test from plan 001 in the diff.
That single `-`/`+` pair is the bug fix, expressed as a test.

---

## Plan 005 — Structured outputs (the big concept of this whole batch)

### The problem in one sentence

Today you ask the model nicely to format its answer ("Spanish line, then
English in parentheses, narrator gets a `[NARRATOR]` prefix...") and then you
wrote ~200 lines of pattern-matching to *guess* what it meant. The guessing
includes things like "it's a correction if the reply starts with one of these
7 English words." Every prompt tweak risks breaking the guesser.

### The fix in one sentence

Modern model APIs let you hand over a **schema** — a machine-readable form
("a tutor reply has: a type that is exactly normal/correction/completion, an
optional narrator string, a dialogue object with spanish and english
fields...") — and the API **guarantees** the reply is valid JSON matching it.
The model fills in a form instead of writing freeform text. The 200-line
guesser gets deleted.

### Where Zod fits

**Zod** is a library where you write a schema once in TypeScript and get two
things from it: the type (for the compiler, at write-time) and a validator
(for runtime — `schema.parse(data)` throws if the data doesn't match). It's
the bridge between "TypeScript types", which vanish when the code runs, and
real-world data arriving over the network, which trusts nobody. The OpenAI
SDK even accepts a Zod schema directly and converts it to the API's format.

### One design decision worth understanding

The plan deliberately does NOT ask the model for `speechSegments` (the list of
what to speak aloud), even though your v2 doc mentions segments. Instead, the
model emits *meaning* (dialogue, correction) and your code *derives* speech
from it. Why: if the model emitted both "the Spanish line" and "the segments
to speak", they could disagree — two sources of truth. Rule of thumb you'll
reuse forever: **let the LLM produce meaning, let code produce mechanics.**

**Exercises**:
1. Before: read `isCorrectionResponse` in `src/lib/tutor.ts` (~line 285) and
   count the ways it could misfire. After: it's deleted.
2. Read `src/lib/tutorSchema.ts` top to bottom — it's ~30 lines and it is now
   the single most important contract in your app.
3. Read the *prompt* diff. Notice that everything about formatting vanished
   and everything about pedagogy (one error per turn, stay in character)
   survived. Prompts shrink when structure moves into the schema.

---

## Plan 006 — Evals: YOUR build

You said you want to write this mostly yourself. Good call — evals are the
highest-leverage LLM skill there is, and they're very learnable. Read plan 006
as your spec, and this section as the course notes.

### What an eval is

A test suite for *behavior you can't fully pin down*. A unit test asks "does
`parse(x)` equal exactly y?" An eval asks "is the tutor *good*?" — directing,
informative, natural (your words from v2_todo). You can't `expect()` "natural."
So evals combine two kinds of measurement:

**1. Deterministic checks** — things code can verify with certainty:
- the reply matched the schema
- the Spanish line is ≤ 2 sentences
- no narrator on correction turns
- completion happened near the target exchange count

These are cheap, perfectly reliable, and you should always squeeze out as many
as possible before reaching for...

**2. LLM-as-judge** — for the fuzzy qualities, you hand the transcript to a
second model with a **rubric** ("score 1–5: does the tutor always tell the
learner exactly what to say next?") and ask for scores plus a one-line reason.

The craft is in the split: everything checkable by code goes in bucket 1;
bucket 2 gets only what genuinely needs judgment. A common beginner mistake is
asking the judge things like "did it output valid JSON?" — code knows that
*for certain*; never pay a model to guess at it.

### The other piece: a fake user

To evaluate the tutor you need someone to talk to it. Two options, and you'll
build both:
- **Scripted**: a fixed list of learner utterances, including *deliberately
  planted mistakes* ("me llamo es Ben" — wrong). Planted mistakes are the
  clever bit: you KNOW a correction should happen, so you can check it did.
- **LLM-simulated**: a second model prompted to act like an A2 learner. More
  varied, less controllable. Scripted is better for regression checks;
  simulated is better for discovering surprises.

### Concepts you'll hit while building

- **Non-determinism**: your tutor runs at temperature 0.7 (creative), so the
  same input gives different outputs each run. One run of an eval means
  little; trends across runs mean a lot. Your judge should run at temperature
  0 (as repeatable as possible).
- **Baseline**: your *first* eval report is the most valuable one — it's the
  "before" photo. Every prompt tweak afterward gets compared to it. Commit the
  report; it's v2 item #0 made real.
- **Judge reliability**: judges drift toward middle scores, get fooled by
  confident-sounding text, and reward verbosity. Defenses: tight rubric
  wording, ask for the rationale BEFORE the score (forces it to think first),
  and sanity-check the judge against your own reading of a few transcripts.
  If your clean-speaker persona and your error-prone persona score the same,
  your eval is measuring nothing — that's the plan's smoke test for the judge.
- **Cost awareness**: every eval run is real API calls. Track tokens per run
  from day one (the plan asks for this in the report). Eval suites that cost
  too much stop getting run, and an eval nobody runs is decoration.

### Suggested build order (gentlest learning curve)

1. **Deterministic checks first** (`checks.ts`). They're pure functions over
   `TutorResponse` objects — exactly like the tests from plan 001, which
   you've now read. No API key needed, fully unit-testable. This is where you
   get comfortable.
2. **The conversation loop** (`run-eval.ts` + scripted user). First version:
   ONE scenario, THREE hardcoded user lines, print the transcript to the
   console. Seeing your tutor talk to a script you wrote is the moment it
   clicks.
3. **The judge** last. Reuse the exact `zodResponseFormat` pattern your agent
   wrote in `src/lib/tutor.ts` — read that file as your reference
   implementation. Your judge is, neatly, the same trick as plan 005: a model
   filling in a schema.
4. Then widen: second scenario, error-prone persona, markdown report.

When you get stuck, ask your agent for a *hint or a review*, not the
implementation — "review my checks.ts, what cases am I missing?" keeps the
learning yours.

### How you'll know you've learned it

You can answer these from your own build, not from this doc:
- Why is D1 (schema validity) checked by code but J3 (natural flow) by a judge?
- Why does the error-prone persona exist?
- Why does the judge run at temperature 0 when the tutor runs at 0.7?
- What would make you trust (or distrust) your judge's scores?

---

## Human-in-the-loop checklist

Work in progress lives in `notes/` (gitignored). Do not commit drafts or
templates. When the v2 batch is done, commit one finished summary to
`docs/planning/improvement-report.md` (and `eval-pipeline-notes.md` from plan 006).

### After plan 001 (required)

1. Run: `npm test`, `npm audit --omit=dev`, note pass count and quirk comments.
2. Create `notes/baseline-snapshot.md` — commit SHA, test counts, quirk list.
3. Diff exercise + sabotage test (sections above).

### After plan 002 (light)

1. Record vulnerability count before/after in `notes/milestone-002.md` or append to baseline.

### After plan 003 (required manual QA)

1. Reproduce bug before fix; confirm audio stops after fix.
2. `notes/milestone-003.md` — pass/fail + date.

### After plan 004 (recommended)

1. Note which KNOWN QUIRK assertion flipped; optional voice smoke.
2. `notes/milestone-004.md`.

### Before plan 005 (required)

1. `notes/scorecard-pre-005.md` — two scenarios, 1–5 scores, rough latency.
2. Only formal "before" quality row while the text parser still runs.

### After plan 005 (required)

1. `notes/scorecard-post-005.md` — same scenarios; compare to pre-005.
2. `notes/milestone-005.md`.

### Plan 006 (you build)

1. Run eval; `notes/eval-YYYY-MM-DD.md` with aggregates from report json.
2. Commit `docs/planning/eval-pipeline-notes.md` when the spike is done.

### Final report (commit when ready)

1. Polish `notes/report.md` locally, then copy the final version to
   `docs/planning/improvement-report.md` and commit that file only.

---

## Reading order, practically

| When | You do |
|------|--------|
| Before agent runs 001 | Read 001 section + human checklist above |
| After 001 | Baseline snapshot + diff + sabotage exercise |
| 002, 003 | Milestone notes + audit / bug reproduction |
| Before 005 | Pre-005 manual scorecard (required) |
| After 005 | Post-005 scorecard + read `tutorSchema.ts` + prompt diff |
| Then | Build 006; local eval notes; commit `docs/planning/improvement-report.md` when done |

One last habit: draft in `notes/`; commit only polished outputs under
`docs/planning/` when you are ready.
