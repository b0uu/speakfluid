# Speakfluid specification

**Status:** MVP shipped  
**Live:** `https://speakfluid.org`

---

## 1. Documentation Map


| Document                                            | Role                                                 |
| --------------------------------------------------- | ---------------------------------------------------- |
| **This file**                                       | Product behavior, architecture, and contracts        |
| `[docs/agents/COMMON.md](docs/agents/COMMON.md)`    | Agent non-negotiables: wins on execution constraints |
| `[README.md](README.md)`                            | Project purpose, setup, high-level roadmap           |
| `[AGENTS.md](AGENTS.md)` / `[CLAUDE.md](CLAUDE.md)` | Coding-agent entrypoints                             |


Engineering experiments (evals, model comparisons, structured outputs) belong in separate planning docs, not here.

When docs conflict: agent root file -> `COMMON.md` -> this spec.

Treat this document as a guideline but feel free to experiment beyond these constraints, as long as development aligns with vision of seamless conversational exchanges.

---

## 2. Product Summary

Speakfluid is a voice based Spanish conversation tutor for beginner to intermediate speakers (~A2–B2). In its current version, users pick a guided roleplay scenario, speak with a tutor character, receive gentle corrections, and finish with a brief recap.

**Core philosophy:** The tutor drives the conversation, not the user. Every exchange should feel like talking to a patient native speaker, not a chatbot.

**Session shape:** Scene intro -> around 8–12 exchanges (around 5 min typical) -> completion summary.

**MVP capabilities:**

1. Enter OpenAI + ElevenLabs API keys (stored in `localStorage`)
2. Choose from 8 scenarios
3. Read a scene-intro card, then begin the roleplay
4. Hold mic to speak (push-to-talk) or type as fallback
5. Follow immersive exchange cards with optional English translation
6. Tap spanish words for contextual definitions
7. Get in-character corrections with English explanation
8. Complete scenario and navigate to the next scenario or return to menu

---

## 3. User Flow

### 1. Landing / API setup

- User enters OpenAI and ElevenLabs keys
- Keys are validated and stored in `localStorage` (`speakfluid-openai-key`, `speakfluid-elevenlabs-key`)
- Returning users can continue or replace keys

### 2. Scenario select (`/scenarios`)

- Grid of 8 scenarios with difficulty and target exchange count
- Selecting a card opens `/session/[scenarioId]`
- Redirects to landing if keys are missing

### 3. Scene intro

- Full-screen intro: scene, user role, tutor character, practice focus
- User taps "Begin Conversation" to start

### 4. Conversation

- Immersive exchange view (not a plain chat transcript)
- Push-to-talk mic or text fallback (text path does **not** play TTS)
- Tutor audio: Spanish dialogue only; English translation and `[NARRATOR]` lines are visual-only
- Tap Spanish words for brief contextual definitions (LLM lookup, cached)
- Spacebar hold-to-talk on desktop

### 5. Completion

- Tutor emits `[SCENARIO_COMPLETE]` with an English session summary
- Summary overlay with "Next Scenario" and "Back to Menu"

---

## 4. Architecture

### Stack


| Layer     | Technology                                           |
| --------- | ---------------------------------------------------- |
| Framework | Next.js 15 App Router, React 19, TypeScript          |
| Styling   | Tailwind CSS (custom tokens in `tailwind.config.ts`) |
| STT       | OpenAI `gpt-4o-transcribe` (`language: "es"` hint)   |
| Tutor LLM | OpenAI `gpt-4o-mini` (temp 0.7, max_tokens 250)      |
| TTS       | ElevenLabs `eleven_flash_v2_5`, voice "Laura"        |
| State     | React hooks (`useConversation`, `useAudioRecorder`)  |
| Deploy    | Vercel: client-only, no backend/DB/auth              |


### Provider split

- **OpenAI**: STT + tutor LLM (one API key, one SDK)
- **ElevenLabs**: TTS only (separate key; chosen for natural Latin American Spanish pronunciation)

Tradeoff: two API keys instead of one. TTS quality directly affects learning because users mimic pronunciation.

### Voice pipeline

```
Hold mic → Record (MediaRecorder) → STT → Tutor LLM → Parse → TTS → Play audio → IDLE
```

Implementation: `[src/hooks/useConversation.ts](src/hooks/useConversation.ts)`, `[src/lib/stt.ts](src/lib/stt.ts)`, `[src/lib/tutor.ts](src/lib/tutor.ts)`, `[src/lib/tts.ts](src/lib/tts.ts)`.

TTS is non-streaming: `fetch` returns an MP3 blob URL, played via `HTMLAudioElement`, then revoked.

### Push-to-talk (MVP default)

Hold button to record, release to send. Intentionally **no VAD** (voice activity detection):

- User controls when they are done speaking
- No processing during thinking pauses
- State machine prevents overlapping record/playback
- No cut-offs from premature silence detection

### Audio state machine

```
IDLE → RECORDING → TRANSCRIBING → THINKING → SPEAKING → IDLE
```

**Rules:**

- User cannot record while state is TRANSCRIBING, THINKING, or SPEAKING
- Mic button disabled outside IDLE
- Status indicator shows current state
- Any API/audio failure returns to IDLE with user-visible error (inline banner on session page)
- TTS must finish before returning to IDLE

---

## 5. Behavior Contracts

Canonical implementations live in source files. Do not duplicate prompt or parser logic in docs.

### Tutor LLM

- System prompt: `TUTOR_SYSTEM_PROMPT` in `[src/lib/tutor.ts](src/lib/tutor.ts)`
- Scenario context injected each turn (role, situation, target exchanges, grammar focus, completion trigger)
- Full conversation history sent as separate user/assistant messages via `buildMessages()`
- Opening line comes from scenario data, not the LLM (on session start)

**Prompt rules (summary):**

- Max 2 Spanish sentences per turn; tutor drives with specific questions
- Stay in character; teach through conversation
- Corrections: English explanation + quoted Spanish fix + "Try again:" retry line; max one error per turn
- Optional `[NARRATOR]` line (visual only, ~every 2–3 turns, never on corrections or first turn)
- Completion: in-character wrap-up, then `[SCENARIO_COMPLETE]` + English session summary

### Tutor response types


| Type         | Content                                                | TTS                           |
| ------------ | ------------------------------------------------------ | ----------------------------- |
| `normal`     | Spanish line + English translation in parentheses      | Spanish line only             |
| `correction` | English explanation + retry prompt with quoted Spanish | Corrected Spanish phrase only |
| `completion` | Final Spanish line + `[SCENARIO_COMPLETE]` + summary   | Spanish line only (if any)    |


Optional `[NARRATOR]` on `normal` and `completion`, never spoken.

Parsing: `parseTutorResponse()` and `buildTutorSpeechText()` in `[src/lib/tutor.ts](src/lib/tutor.ts)`. Parser is strict enough for UI but tolerant of minor format drift.

### Message and exchange types

Types defined in `[src/types/index.ts](src/types/index.ts)`. Exchanges grouped from flat messages by `[src/lib/exchanges.ts](src/lib/exchanges.ts)`.

### TTS contract

Matches `[docs/agents/COMMON.md](docs/agents/COMMON.md)`:

- Speak Spanish tutor lines only; English stays visual
- Exclude `[NARRATOR]` from spoken audio
- Correction turns: speak the corrected Spanish phrase/sentence
- One blob URL per response; revoke after playback

### STT contract

- Audio blob → OpenAI `gpt-4o-transcribe` with `language: "es"`
- Empty or very short recordings rejected before API call
- Known gap: hardcoded Spanish hint struggles with Spanglish/code-switching (see §9)

### API entrypoints


| Concern        | File                                             |
| -------------- | ------------------------------------------------ |
| STT            | `[src/lib/stt.ts](src/lib/stt.ts)`               |
| Tutor + parser | `[src/lib/tutor.ts](src/lib/tutor.ts)`           |
| TTS            | `[src/lib/tts.ts](src/lib/tts.ts)`               |
| Word lookup    | `[src/lib/wordLookup.ts](src/lib/wordLookup.ts)` |
| Key storage    | `[src/lib/keys.ts](src/lib/keys.ts)`             |


---

## 6. Scenarios

### Schema

```typescript
interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: string;
  targetExchanges: number;
  tutorRole: string;
  userRole: string;
  situation: string;
  openingLine: string;       // Spanish, played/displayed at session start
  keyVocabulary: string[];
  grammarFocus: string;
  completionTrigger: string;
}
```

Canonical data: `[src/lib/scenarios.ts](src/lib/scenarios.ts)`

### Scenario list


| ID                     | Title                         | Difficulty   | Exchanges | Grammar focus                            |
| ---------------------- | ----------------------------- | ------------ | --------- | ---------------------------------------- |
| `introducing-yourself` | Meeting Someone New           | beginner     | 8         | Present tense ser/estar, basic questions |
| `ordering-food`        | Ordering at a Restaurant      | beginner     | 10        | Conditional, polite requests, food vocab |
| `daily-routine`        | Your Daily Routine            | beginner     | 10        | Reflexive verbs, time expressions        |
| `last-weekend`         | What Did You Do Last Weekend? | intermediate | 10        | Preterite tense, narration               |
| `asking-directions`    | Finding Your Way              | intermediate | 8         | Imperative commands, directions          |
| `shopping-market`      | Shopping at a Market          | intermediate | 10        | Numbers, prices, negotiation             |
| `making-plans`         | Making Plans With a Friend    | intermediate | 10        | Conditional, preferences                 |
| `describing-family`    | Talking About Your Family     | advanced     | 10        | Descriptions, ser vs estar               |


---

## 7. UI Surface

**Design:** Clean editorial layout: blue/grey palette, DM Serif Display + DM Sans + JetBrains Mono. Tokens in `[tailwind.config.ts](tailwind.config.ts)`; fonts loaded in `[src/app/layout.tsx](src/app/layout.tsx)`. Global styles in `[src/styles/globals.css](src/styles/globals.css)`.

**Key components:**


| Component                                              | Purpose                             |
| ------------------------------------------------------ | ----------------------------------- |
| `ApiKeyForm`                                           | Landing key entry + validation      |
| `ScenarioGrid` / `ScenarioCard`                        | Scenario menu                       |
| `SceneIntro`                                           | Pre-conversation setup card         |
| `ImmersiveDialogueView` / `ExchangeCard`               | Exchange-based session renderer     |
| `TappableSpanishText` / `WordTooltip`                  | Tap-to-define Spanish words         |
| `MicButton` / `StatusIndicator` / `WaveformVisualizer` | Push-to-talk controls               |
| `ScenarioHeader`                                       | Session context + exchange progress |
| `SessionSummary`                                       | Completion overlay + navigation     |
| `OnboardingTooltip`                                    | First-visit mic hint                |


**Routes:** `/` (landing), `/scenarios`, `/session/[scenarioId]`

---

## 8. Code Map

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing / API keys
│   ├── scenarios/page.tsx
│   └── session/[scenarioId]/page.tsx
├── components/                     # UI (see §7)
├── hooks/
│   ├── useConversation.ts          # Core state machine + pipeline
│   ├── useAudioRecorder.ts
│   ├── useAudioPlayer.ts
│   └── useTTS.ts                   # Unused: TTS lives in useConversation
├── lib/
│   ├── openai.ts, elevenlabs.ts    # Client factories + key validation
│   ├── stt.ts, tts.ts, tutor.ts
│   ├── scenarios.ts, exchanges.ts, wordLookup.ts, keys.ts
└── types/index.ts
```

---

## 9. Known Limitations

- **Client-side API keys**: sent directly from browser to providers (`dangerouslyAllowBrowser`). Fine for personal BYOK MVP; not production SaaS.
- **Spanglish / code-switching STT**: `language: "es"` hint can mis-transcribe mixed English–Spanish input.
- **No persistence**: no session history, progress tracking, or accounts.
- **No automated tests**: parser and prompt behavior validated manually.
- **Text fallback skips TTS**: typed messages display tutor text only.
- **Unused hook**: `useTTS.ts` exists but orchestration is inline in `useConversation.ts`.

---

## 10. Product Roadmap

Post-MVP product direction (aligned with `[README.md](README.md)`):


| Priority  | Feature                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------- |
| Near-term | Progress tracking across sessions                                                               |
| Near-term | Difficulty recommendations based on performance                                                 |
| Mid-term  | Custom user-defined scenarios                                                                   |
| Mid-term  | Session history / review                                                                        |
| Long-term | Additional languages and dialect modes                                                          |
| Long-term | OpenAI Realtime API (lower-latency speech-to-speech)                                            |
| Long-term | Mobile app (PWA or native)                                                                      |
| Optional  | VAD as alternative to push-to-talk, only if reliability is proven; MVP intentionally avoids it |


**Explicitly out of scope for MVP:** backend proxy, database, auth, gamification, multi-language support.

Engineering experiments (eval pipelines, model upgrades, structured outputs, observability) will be tracked in separate planning docs.