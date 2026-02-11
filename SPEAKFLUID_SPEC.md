# SpeakFluid — AI Spanish Conversation Tutor

## Complete Project Specification & Implementation Plan

**Version:** 1.0 — MVP
**Date:** February 2026
**Build Tool:** Claude Code (Opus 4.6) or Codex (GPT-5.3)

---

## 1. Product Overview

SpeakFluid is a voice-first conversational Spanish tutor web application. Users open the app, enter a guided conversation scenario (e.g., ordering at a restaurant), speak in Spanish with a tutor character, receive gentle corrections and scaffolding, and leave after a 3–5 minute session with a brief recap of what they practiced.

**Core philosophy:** The tutor drives the conversation, not the user. Every exchange should feel like talking to a patient, encouraging friend who happens to be a native Spanish speaker — not like interacting with a chatbot.

### What "Done" Looks Like for the MVP

A user can:
1. Open the app in a browser
2. Enter their OpenAI API key and ElevenLabs API key (both persisted in localStorage)
3. See a menu of 8 conversation scenarios with brief English descriptions
4. Select a scenario
5. Hear the tutor introduce the scenario and begin speaking in Spanish
6. Hold a button to speak, release to send
7. See their transcribed speech and the tutor's response (text backup)
8. Get corrected naturally when they make errors, with English explanation
9. Complete the scenario in ~8-12 exchanges
10. See a brief summary of what they practiced and errors they made
11. Click "Next" to enter the next scenario, or return to the menu

---

## 2. User Flow (Step by Step)

```
┌─────────────────────────────────────────────────────────────┐
│                      LANDING / API SETUP                     │
│                                                              │
│  User enters two API keys:                                   │
│  1. OpenAI API key (for speech recognition + tutor brain)    │
│  2. ElevenLabs API key (for tutor voice)                     │
│  Both validated → stored in localStorage                     │
│  Brief explanation: "SpeakFluid uses your API keys for speech     │
│  recognition, conversation, and voice. Your keys stay in     │
│  your browser."                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      SCENARIO SELECT                         │
│                                                              │
│  Grid of 8 scenario cards, each showing:                     │
│  - Icon/emoji                                                │
│  - Title (English)                                           │
│  - 1-line description (English)                              │
│  - Difficulty badge (Beginner / Intermediate / Advanced)     │
│                                                              │
│  User clicks a card to begin.                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     CONVERSATION SESSION                     │
│                                                              │
│  Layout:                                                     │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Scenario context bar (title + brief English desc)  │     │
│  ├─────────────────────────────────────────────────────┤     │
│  │                                                     │     │
│  │  Chat transcript area                               │     │
│  │  (scrollable, shows both text + who is speaking)    │     │
│  │                                                     │     │
│  │  Tutor messages: Spanish text + English subtext     │     │
│  │  User messages: transcribed speech                  │     │
│  │  Corrections: highlighted inline                    │     │
│  │                                                     │     │
│  ├─────────────────────────────────────────────────────┤     │
│  │  🎤 HOLD TO SPEAK button (large, prominent)        │     │
│  │  Status: "Listening..." / "Processing..." / idle    │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  Flow:                                                       │
│  1. Tutor speaks first (audio plays + text appears)          │
│  2. User holds mic button, speaks, releases                  │
│  3. Audio → OpenAI transcribe STT → text appears in transcript│
│  4. Text → LLM tutor → response text appears                │
│  5. Response → TTS → audio plays                             │
│  6. Repeat until scenario complete (~8-12 exchanges)         │
│  7. Tutor signals completion naturally                       │
│  8. Transition to summary screen                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     SESSION SUMMARY                          │
│                                                              │
│  - Scenario completed badge                                  │
│  - "What you practiced" (2-3 bullet points)                  │
│  - Corrections made (if any), shown as before/after          │
│  - [Next Scenario →] button (auto-selects next)              │
│  - [← Back to Menu] button                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Architecture & Tech Stack

### Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **Next.js 14+ (App Router)** | React-based, easy Vercel deploy, great for portfolio |
| Language | **TypeScript** | Type safety for audio state + API contracts |
| Styling | **Tailwind CSS** | Rapid styling, but with custom design tokens to avoid AI-slop |
| STT | **OpenAI GPT-4o Transcribe** (`gpt-4o-transcribe`) | Lower error rate than Whisper, same SDK, better accent handling |
| LLM | **OpenAI GPT-4o-mini** | Fast, cheap, good instruction following, same API key |
| TTS | **ElevenLabs Flash v2.5** | Strong Spanish pronunciation and bilingual prosody; chosen for tutor voice quality |
| State | **React state + Context** | No backend needed for MVP |
| Deploy | **Vercel** | Free tier, instant deploys, perfect for portfolio |

### Why This Provider Split (OpenAI + ElevenLabs)

The previous attempt suffered from integration complexity across many services. This MVP uses just two providers with clear responsibilities:

- **OpenAI** handles STT (gpt-4o-transcribe) and LLM (GPT-4o-mini) — same SDK, same API key
- **ElevenLabs** handles TTS only — separate SDK, separate API key

Why not keep TTS on OpenAI too? Because TTS quality directly impacts learning — the user is learning pronunciation by listening. In project testing, ElevenLabs has produced more natural Spanish pronunciation and smoother bilingual prosody for this use case.

The tradeoff is two API keys instead of one. The landing page collects both.

### Voice Pipeline Architecture

```
USER HOLDS BUTTON          RELEASE BUTTON           LLM CALL              TTS PLAYBACK
     │                          │                      │                      │
     ▼                          ▼                      ▼                      ▼
┌──────────┐            ┌──────────────┐        ┌───────────┐        ┌──────────────┐
│ MediaRec │  ────────▶ │ OpenAI       │ ─────▶ │ GPT-4o    │ ─────▶ │ ElevenLabs   │
│ (browser)│  audio     │ gpt-4o-      │ text   │ mini      │ text   │ Flash v2.5   │
│          │  blob      │ transcribe   │        │           │        │ (streaming)  │
└──────────┘            └──────────────┘        └───────────┘        └──────────────┘
                                                      │                      │
                                                      ▼                      ▼
                                                ┌───────────┐        ┌──────────────┐
                                                │ Update     │        │ Audio elem   │
                                                │ transcript │        │ plays back   │
                                                │ + state    │        │              │
                                                └───────────┘        └──────────────┘
```

### Critical Design Decision: Push-to-Talk

The MVP uses **push-to-talk** (hold button to record, release to send). This eliminates the entire class of bugs from the previous attempt:

- ✅ No VAD (Voice Activity Detection) needed — user controls when they're done
- ✅ No "processes input when user pauses to think" — recording only happens while button is held
- ✅ No double-audio — clear state machine prevents overlapping playback
- ✅ No cut-offs — user explicitly signals when they're finished

### Audio State Machine

This is critical. The previous attempt had glitches because audio states were not managed rigorously. The app must enforce this state machine:

```
                    ┌──────────┐
                    │   IDLE   │ ◀──────────────────────────────┐
                    └────┬─────┘                                │
                         │ user presses mic                     │
                         ▼                                      │
                    ┌──────────┐                                │
                    │RECORDING │                                │
                    └────┬─────┘                                │
                         │ user releases mic                    │
                         ▼                                      │
                    ┌──────────────┐                            │
                    │ TRANSCRIBING │  (gpt-4o-transcribe call)  │
                    └────┬─────────┘                            │
                         │ transcription received               │
                         ▼                                      │
                    ┌──────────┐                                │
                    │ THINKING │  (LLM API call)                │
                    └────┬─────┘                                │
                         │ response received                    │
                         ▼                                      │
                    ┌──────────┐                                │
                    │ SPEAKING │  (TTS playing)                 │
                    └────┬─────┘                                │
                         │ audio playback complete              │
                         └──────────────────────────────────────┘

RULES:
- User CANNOT record while state is TRANSCRIBING, THINKING, or SPEAKING
- Mic button is visually disabled during non-IDLE states
- Each state has a visual indicator (icon + text)
- If any API call fails, return to IDLE with error toast
- TTS audio must fully complete before returning to IDLE
```

---

## 4. Scenario Definitions

Each scenario is a self-contained conversation template. The LLM uses these to guide the conversation.

### Scenario Schema

```typescript
interface Scenario {
  id: string;
  title: string;                    // English title for the card
  description: string;              // 1-line English description
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: string;                     // Emoji
  targetExchanges: number;          // How many back-and-forth exchanges before wrapping up
  tutorRole: string;                // Who the tutor plays in this scenario
  userRole: string;                 // Who the user plays
  situation: string;                // Detailed context for the LLM
  openingLine: string;              // Tutor's first line (in Spanish)
  keyVocabulary: string[];          // Words/phrases the tutor should try to elicit
  grammarFocus: string;             // Grammar concept practiced
  completionTrigger: string;        // What constitutes "done" for this scenario
}
```

### The 8 MVP Scenarios

```typescript
const scenarios: Scenario[] = [
  {
    id: "introducing-yourself",
    title: "Meeting Someone New",
    description: "Introduce yourself and learn about a new acquaintance at a café.",
    difficulty: "beginner",
    icon: "👋",
    targetExchanges: 8,
    tutorRole: "A friendly college student named Carlos who is sitting at a café",
    userRole: "A traveler who just sat down at the same table",
    situation: "The user has just sat down at a busy café in Mexico City. Carlos, a local college student, is already sitting there and starts a friendly conversation. The goal is to exchange basic personal information: names, where you're from, what you do, and a bit about your interests.",
    openingLine: "¡Hola! Perdona, ¿está ocupada esta silla? Ah, ya veo que no. Me llamo Carlos. ¿Y tú, cómo te llamas?",
    keyVocabulary: ["me llamo", "soy de", "mucho gusto", "¿a qué te dedicas?", "me gusta"],
    grammarFocus: "Present tense ser/estar, basic questions",
    completionTrigger: "User has shared their name, origin, and at least one interest or occupation"
  },
  {
    id: "ordering-food",
    title: "Ordering at a Restaurant",
    description: "Order a meal, ask about the menu, and handle a small mix-up with your order.",
    difficulty: "beginner",
    icon: "🍽️",
    targetExchanges: 10,
    tutorRole: "A friendly waiter at a casual Mexican restaurant",
    userRole: "A customer ordering dinner",
    situation: "The user is at a casual restaurant in Guadalajara. The waiter is friendly and patient. The conversation should cover: greeting, asking what's good, ordering a main dish and a drink, and at the end the waiter accidentally brings the wrong drink, giving the user a chance to politely correct the mistake.",
    openingLine: "¡Buenas noches! Bienvenido. Aquí tiene el menú. ¿Ya sabe qué quiere tomar, o necesita un momento?",
    keyVocabulary: ["me gustaría", "¿qué recomienda?", "la cuenta", "para mí", "disculpe"],
    grammarFocus: "Conditional (me gustaría), polite requests, food vocabulary",
    completionTrigger: "User has ordered food, a drink, and resolved the order mix-up"
  },
  {
    id: "last-weekend",
    title: "What Did You Do Last Weekend?",
    description: "Tell a friend about your weekend activities and hear about theirs.",
    difficulty: "intermediate",
    icon: "📅",
    targetExchanges: 10,
    tutorRole: "A coworker named Lucía who you're chatting with during a break",
    userRole: "A coworker sharing weekend stories",
    situation: "Monday morning at work. Lucía, a friendly coworker, asks the user about their weekend. The user should describe 2-3 activities they did. Lucía will share her own weekend too and ask follow-up questions. This practices past tense narration in a natural, low-pressure way.",
    openingLine: "¡Buenos días! ¿Qué tal el fin de semana? Yo estoy cansadísima, hice demasiadas cosas. ¿Tú qué hiciste?",
    keyVocabulary: ["fui", "hice", "comí", "vi", "salí con", "el sábado", "el domingo"],
    grammarFocus: "Preterite tense (regular and irregular), time expressions",
    completionTrigger: "User has described at least 2 weekend activities using past tense"
  },
  {
    id: "asking-directions",
    title: "Finding Your Way",
    description: "Ask a local for directions to a museum in an unfamiliar city.",
    difficulty: "intermediate",
    icon: "🗺️",
    targetExchanges: 8,
    tutorRole: "A helpful local standing on a street corner",
    userRole: "A tourist trying to find a museum",
    situation: "The user is a tourist in Buenos Aires trying to find the Museo Nacional de Bellas Artes. They approach a friendly local for directions. The local gives step-by-step directions using landmarks. The user should confirm understanding and ask clarifying questions. The local intentionally gives slightly complex directions to encourage the user to ask for repetition.",
    openingLine: "¿Sí? ¿En qué le puedo ayudar?",
    keyVocabulary: ["¿dónde queda?", "siga derecho", "doble a la izquierda/derecha", "a dos cuadras", "¿puede repetir?"],
    grammarFocus: "Imperative commands, location prepositions, clarification phrases",
    completionTrigger: "User has understood and confirmed the directions"
  },
  {
    id: "daily-routine",
    title: "Your Daily Routine",
    description: "Describe your typical day to a language exchange partner.",
    difficulty: "beginner",
    icon: "⏰",
    targetExchanges: 10,
    tutorRole: "A language exchange partner named Sofía on a video call",
    userRole: "Someone practicing Spanish with a language partner",
    situation: "The user is doing a language exchange via video call with Sofía from Colombia. She wants to practice talking about daily routines — what time you wake up, what you do in the morning, afternoon, and evening. Sofía will share her own routine too. This is a casual, supportive conversation.",
    openingLine: "¡Hola! ¡Qué bueno verte! Bueno, hoy quiero que practiquemos hablar sobre la rutina diaria. ¿A qué hora te levantas normalmente?",
    keyVocabulary: ["me levanto", "desayuno", "trabajo/estudio", "almuerzo", "me acuesto", "normalmente", "después"],
    grammarFocus: "Reflexive verbs, time expressions, present tense daily activities",
    completionTrigger: "User has described morning, afternoon, and evening routines"
  },
  {
    id: "shopping-market",
    title: "Shopping at a Market",
    description: "Buy fruit and souvenirs at an open-air market, ask prices, and negotiate a little.",
    difficulty: "intermediate",
    icon: "🛒",
    targetExchanges: 10,
    tutorRole: "A cheerful vendor at an outdoor market",
    userRole: "A shopper looking for fruit and a souvenir",
    situation: "The user is at a colorful outdoor market in Oaxaca, Mexico. The vendor sells both fresh fruit and small handmade souvenirs. The user should ask about prices, quantities, and try a gentle negotiation on the souvenir price. The vendor is friendly but will push back a little on the price, making it a fun exchange.",
    openingLine: "¡Pásele, pásele! Tenemos las mejores frutas de todo Oaxaca. ¿Qué le ofrezco hoy?",
    keyVocabulary: ["¿cuánto cuesta?", "me da", "kilo", "demasiado caro", "¿no me puede dar un descuento?", "me lo llevo"],
    grammarFocus: "Numbers, prices, informal negotiation phrases, demonstratives",
    completionTrigger: "User has asked about prices and completed a purchase"
  },
  {
    id: "making-plans",
    title: "Making Plans With a Friend",
    description: "Coordinate with a friend to pick a time, place, and activity for the weekend.",
    difficulty: "intermediate",
    icon: "📱",
    targetExchanges: 10,
    tutorRole: "A friend named Diego who wants to hang out this weekend",
    userRole: "A friend trying to make weekend plans",
    situation: "Diego calls the user to make plans for Saturday. They need to agree on what to do (movie, beach, restaurant, etc.), what time, and where to meet. Diego will suggest things but also be flexible, creating natural back-and-forth negotiation. Some of Diego's initial suggestions won't work, requiring the user to suggest alternatives.",
    openingLine: "¡Ey! ¿Qué onda? Oye, ¿tienes planes para el sábado? Estaba pensando que podríamos hacer algo juntos.",
    keyVocabulary: ["¿qué te parece?", "podríamos", "a las (hora)", "nos vemos en", "mejor", "prefiero"],
    grammarFocus: "Conditional (podríamos), expressing preferences, time/place vocabulary",
    completionTrigger: "Users have agreed on an activity, time, and meeting place"
  },
  {
    id: "describing-family",
    title: "Talking About Your Family",
    description: "Share about your family members and hear about someone else's family.",
    difficulty: "advanced",
    icon: "👨‍👩‍👧‍👦",
    targetExchanges: 10,
    tutorRole: "A host mother named Doña Carmen at a homestay",
    userRole: "A student staying with a host family",
    situation: "The user has just arrived at their homestay in Costa Rica. Doña Carmen, the warm and curious host mother, wants to get to know the user's family. She'll ask about parents, siblings, what they do, and their personalities. She'll also share about her own family. This practices descriptive language and more complex sentence structures.",
    openingLine: "¡Bienvenido a tu nueva casa! Siéntate, siéntate. Cuéntame de tu familia. ¿Tienes hermanos?",
    keyVocabulary: ["mi hermano/a mayor/menor", "se dedica a", "se parece a", "nos llevamos bien/mal", "tiene (edad) años"],
    grammarFocus: "Possessives, physical/personality descriptions, family vocabulary, ser vs estar",
    completionTrigger: "User has described at least 3 family members with some detail"
  }
];
```

---

## 5. The Tutor System Prompt

This is the most critical component. It directly addresses every failure from the previous attempt.

```
You are the tutor in SpeakFluid, a conversational Spanish practice app. You are currently playing a specific character in a scenario to help the user practice speaking Spanish.

<core_identity>
Your name and role change per scenario (provided in the scenario context). You speak Latin American Spanish. You are warm, patient, encouraging, and you guide the conversation actively — the user should never feel lost or unsure what to say next.
</core_identity>

<conversation_rules>
CRITICAL RULES — follow these exactly:

1. YOUR LINES MUST BE SHORT. Maximum 2 sentences in Spanish per turn. This is non-negotiable. The user needs to be able to process and respond to what you say. Long tutor turns are the #1 UX failure.

2. YOU drive the conversation. Always end your turn with a specific question or prompt that tells the user exactly what to say next. Never give open-ended questions like "¿Qué más?" or "Cuéntame más." Instead, ask targeted questions: "¿Y a qué hora llegaste?" or "¿Prefieres la playa o el cine?"

3. Keep the conversation moving toward the scenario's completion goal. You know approximately how many exchanges this scenario should take. Pace accordingly — don't rush, but don't let the conversation stall or loop.

4. Be a character, not a teacher. Stay in your role. If you're a waiter, act like a waiter. If you're a friend, act like a friend. The teaching happens through the conversation, not despite it.

5. When the scenario's completion goal has been met, wrap up naturally in-character (e.g., "¡Que disfrute la comida!" for a restaurant scene) and then add on a new line: [SCENARIO_COMPLETE]
</conversation_rules>

<error_correction_protocol>
When the user makes a grammatical or vocabulary error:

1. First, briefly acknowledge what they were trying to say so they feel heard.
2. Provide the correction FULLY IN ENGLISH. Highlight the specific Spanish word/phrase they got wrong and show the correct form.
3. Ask them to try the corrected sentence again.
4. When they say it correctly (or close enough), praise them briefly IN SPANISH and then continue the scenario conversation IN SPANISH with a new question.

Example flow:
- User: "Yo fue al parque el sábado."
- Tutor: "Almost! 'Fue' is for él/ella/usted. For 'yo,' the correct form is 'fui' — Yo fui al parque. Can you try the whole sentence again?"
- User: "Yo fui al parque el sábado."
- Tutor: "¡Perfecto! ¿Y qué hiciste en el parque?"

IMPORTANT:
- Correct a maximum of ONE error per turn. If they make multiple errors, correct the most important one and let the others go. Overcorrection kills conversation flow.
- If the error is minor (accent, small article mistake) and meaning is clear, you may skip correction entirely and just continue the conversation.
- The English correction should be 1-2 sentences max. Do not lecture.
- After correction and retry, ALWAYS switch back to Spanish for the next scenario question.
</error_correction_protocol>

<bilingual_output_format>
Your responses must follow this exact format for every turn:

SPANISH LINE(S): Your in-character dialogue in Spanish (1-2 sentences max).
ENGLISH LINE: A natural English translation of what you just said, in parentheses on the next line.

Example:
"¿Ya sabe qué quiere tomar, o necesita un momento?"
(Do you know what you'd like to drink, or do you need a moment?)

When doing error correction, the format changes:
ENGLISH CORRECTION: Brief explanation + correct form
RETRY PROMPT: Ask them to try again (in English)

Then after retry:
SPANISH PRAISE + NEXT QUESTION: Back to the regular format
(English translation)

NEVER mix Spanish and English within the same sentence. They are always on separate lines.
</bilingual_output_format>

<pacing_and_completion>
- Track how many exchanges have occurred. The scenario context tells you the target number.
- Around 75% of the way through, start guiding toward the natural conclusion of the scenario.
- At 100%, wrap up the conversation naturally in-character.
- After your final in-character line, output [SCENARIO_COMPLETE] on its own line.
- In the completion turn, include a brief 2-3 sentence summary in English of what the user practiced and any corrections made during the session. Format:

[SCENARIO_COMPLETE]
Session summary: You practiced [topic]. You used [grammar point] well. One thing to keep practicing: [correction area].
</bilingual_output_format>

<what_not_to_do>
- Do NOT give long explanations of grammar rules
- Do NOT list vocabulary words
- Do NOT break character to give meta-commentary about the lesson
- Do NOT ask "¿Entiendes?" or "¿Tiene sentido?" — just move forward
- Do NOT repeat the same question if the user answered it
- Do NOT use formal usted unless the scenario specifically calls for it
- Do NOT output more than 3 lines of text total per turn (Spanish + English translation, or correction + retry prompt)
</what_not_to_do>

<handling_edge_cases>
- If user responds in English: Gently prompt them to try in Spanish. Say: "¡Inténtalo en español! Try saying: [give them a starter phrase]."
- If user says something off-topic: Briefly acknowledge, then steer back. "Jaja, interesante. Pero dime — [scenario-relevant question]."
- If user says "I don't know" or seems stuck: Give them a scaffold. "No te preocupes. Try saying: 'Yo...' and then tell me [specific thing]."
- If user's response is too short (just one word): Accept it, but prompt expansion. "Bien, ¿pero puedes decirme un poco más? Por ejemplo..."
- If user is doing very well: Slightly increase complexity. Use less common vocabulary, speak slightly faster (reflected in more natural/contracted phrasing), or add a small unexpected twist to the scenario.
</handling_edge_cases>
```

---

## 6. Frontend Design Specification

### Design Direction

**Aesthetic:** Clean, warm, and inviting — like a language café. NOT clinical or app-store generic. Think "Duolingo meets a well-designed indie app." Earthy tones, rounded shapes, a touch of Mexican/Latin American warmth in the color palette.

**Avoid:** Purple gradients, Inter font, generic card layouts, dark mode by default, excessive shadows.

### Design Tokens

```css
:root {
  /* Colors — warm, earthy, Latin-inspired palette */
  --color-bg: #FDF6EC;              /* Warm cream background */
  --color-surface: #FFFFFF;          /* Card/panel background */
  --color-primary: #D4572A;          /* Terracotta — main accent */
  --color-primary-light: #E8845F;    /* Lighter terracotta */
  --color-secondary: #2D6A4F;        /* Deep green */
  --color-secondary-light: #52B788;  /* Light green for success */
  --color-text: #2C1810;             /* Dark warm brown */
  --color-text-muted: #8B7355;       /* Muted brown */
  --color-text-english: #5C6B73;     /* Cool gray for English translations */
  --color-error-bg: #FFF0E6;         /* Light orange for correction cards */
  --color-mic-active: #D4572A;       /* Terracotta pulse when recording */
  --color-mic-disabled: #C4B5A0;     /* Muted when unavailable */

  /* Typography */
  --font-display: 'DM Serif Display', Georgia, serif;   /* Headings, scenario titles */
  --font-body: 'DM Sans', -apple-system, sans-serif;    /* Body text, UI elements */
  --font-mono: 'JetBrains Mono', monospace;              /* Corrections, grammar highlights */

  /* Spacing */
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 22px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-card: 0 2px 8px rgba(44, 24, 16, 0.06);
  --shadow-elevated: 0 8px 24px rgba(44, 24, 16, 0.1);
}
```

### Key UI Components

**Scenario Card (on select screen):**
- Rounded rectangle with subtle shadow
- Left-aligned icon (emoji, large)
- Title in display font
- Description in body font, muted color
- Small difficulty badge (colored pill)
- Hover: slight lift + border glow in primary color

**Conversation Bubble (tutor):**
- Left-aligned, surface background, rounded
- Spanish text in body font, normal weight, dark text
- English translation below in smaller text, muted gray-blue color
- Subtle left border in secondary green

**Conversation Bubble (user):**
- Right-aligned, primary-light background, white text
- Rounded, no border
- Transcribed text only

**Correction Card:**
- Full-width card with warm orange background (--color-error-bg)
- Left accent border in primary terracotta
- Shows: "Almost! [explanation]" + correct form highlighted
- "Try again" prompt below

**Mic Button:**
- Large circular button, centered at bottom
- IDLE: Outlined, secondary color, mic icon
- RECORDING: Filled primary color with pulsing ring animation
- PROCESSING: Gray with spinning indicator
- Disabled states clearly visually distinct (grayed out, no hover effect)
- Touch target: minimum 64x64px

**Session Summary Card:**
- Centered card with checkmark icon
- "What you practiced" section
- "Corrections" section (if any) with before/after
- Two buttons: "Next Scenario →" (primary) and "Back to Menu" (text button)

---

## 7. File Structure

```
speakfluid/
├── public/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with fonts, metadata
│   │   ├── page.tsx                    # Landing / API key setup
│   │   ├── scenarios/
│   │   │   └── page.tsx                # Scenario selection grid
│   │   └── session/
│   │       └── [scenarioId]/
│   │           └── page.tsx            # Active conversation session
│   ├── components/
│   │   ├── ApiKeyForm.tsx              # API key input + validation
│   │   ├── ScenarioCard.tsx            # Individual scenario card
│   │   ├── ScenarioGrid.tsx            # Grid of scenario cards
│   │   ├── ConversationView.tsx        # Scrollable chat transcript
│   │   ├── MessageBubble.tsx           # Individual message (tutor or user)
│   │   ├── CorrectionCard.tsx          # Error correction display
│   │   ├── MicButton.tsx               # Push-to-talk button with states
│   │   ├── StatusIndicator.tsx         # "Listening..." / "Thinking..." text
│   │   ├── SessionSummary.tsx          # End-of-session recap
│   │   └── ScenarioHeader.tsx          # Context bar during session
│   ├── hooks/
│   │   ├── useAudioRecorder.ts         # MediaRecorder wrapper
│   │   ├── useAudioPlayer.ts           # Audio playback with state tracking
│   │   ├── useConversation.ts          # Core conversation state machine
│   │   └── useTTS.ts                   # TTS API call + audio creation
│   ├── lib/
│   │   ├── openai.ts                   # OpenAI client factory (uses stored key)
│   │   ├── elevenlabs.ts               # ElevenLabs client factory (uses stored key)
│   │   ├── stt.ts                      # STT API call (gpt-4o-transcribe)
│   │   ├── tts.ts                      # TTS API call (ElevenLabs Flash v2.5)
│   │   ├── tutor.ts                    # LLM call with system prompt + conversation history
│   │   └── scenarios.ts                # Scenario data (the 8 scenarios)
│   ├── types/
│   │   └── index.ts                    # TypeScript types (Scenario, Message, AudioState, etc.)
│   └── styles/
│       └── globals.css                 # Tailwind config + CSS custom properties
├── .env.local                          # (empty — API keys stored in localStorage)
├── AGENTS.md                           # Codex instructions (imports shared agent docs)
├── CLAUDE.md                           # Claude Code instructions (imports shared agent docs)
├── docs/
│   └── agents/
│       ├── COMMON.md                   # Shared agent constraints and contracts
│       ├── CODEX.md                    # Codex-specific overlay
│       ├── CLAUDE_CODE.md              # Claude Code-specific overlay
│       └── SOURCES.md                  # Official reference links for agent docs
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 8. Implementation Phases

Build in this exact order. Each phase must be fully working before moving to the next.

### Phase 1: Static Shell (30 min)

**Goal:** App skeleton renders, you can navigate between pages.

- Set up Next.js project with TypeScript + Tailwind
- Install Google Fonts (DM Serif Display, DM Sans)
- Create the 3 pages: landing, scenario select, session
- Implement design tokens in globals.css
- Create ScenarioCard component with hardcoded data
- Render the scenario grid with all 8 scenarios
- Navigation: landing → scenario select → session/[id]
- No API calls yet. Placeholder content everywhere.

**Verify:** You can click through all 3 pages with correct routing.

### Phase 2: API Key Management (20 min)

**Goal:** User can enter, validate, and persist both API keys.

- ApiKeyForm component on landing page with two fields:
  - OpenAI API key (validated by calling list models endpoint)
  - ElevenLabs API key (validated by calling the /v1/user endpoint)
- On submit: validate both keys in parallel
- If both valid: store in localStorage (`speakfluid-openai-key`, `speakfluid-elevenlabs-key`), redirect to scenario select
- If either invalid: show specific error message indicating which key failed
- On scenario select page: check for both keys, redirect to landing if either missing
- Add "Change API keys" small link in scenario select header

**Verify:** Enter valid keys → lands on scenario page. Refresh → still there. Invalid key → specific error shown.

### Phase 3: Conversation Engine — Text Only (1 hour)

**Goal:** Full text-based conversation works with the LLM. No audio yet.

- Implement `tutor.ts`: constructs the system prompt + injects scenario context + sends conversation history to GPT-4o-mini
- Implement `useConversation` hook:
  - Holds conversation state: messages array, current scenario, exchange count, audio state
  - `sendMessage(text: string)` → calls LLM → parses response → updates messages
  - Detects `[SCENARIO_COMPLETE]` → triggers summary display
- Implement `ConversationView` + `MessageBubble` + `CorrectionCard`
- Parse tutor responses: split Spanish line, English translation, corrections
- Add a temporary text input at the bottom (will be replaced by mic in Phase 4)
- Implement `SessionSummary` component
- Implement "Next Scenario" navigation

**Verify:** Select a scenario → tutor opens with its first line → type a Spanish response → tutor responds with short, guided response → correction flow works → scenario completes → summary shown → can navigate to next.

**This phase is the most important.** The tutor prompt must produce short, guided, in-character responses. If it doesn't, tune the prompt before moving on. Do not proceed to audio until text conversations feel right.

### Phase 4: Voice Pipeline (1 hour)

**Goal:** Push-to-talk recording → gpt-4o-transcribe → tutor → ElevenLabs playback.

- Implement `useAudioRecorder`:
  - Uses MediaRecorder API
  - Starts on mousedown/touchstart of mic button
  - Stops on mouseup/touchend
  - Returns audio Blob (webm format)
- Implement `stt.ts`:
  - Takes audio Blob → converts to File → sends to OpenAI gpt-4o-transcribe
  - Returns transcribed text
  - Set `language: "es"` to hint Spanish
- Implement `tts.ts`:
  - Takes text string → sends to ElevenLabs Text-to-Speech API
  - Model: `eleven_flash_v2_5`
  - Voice: choose a Latin American Spanish voice from ElevenLabs voice library (e.g., "Charlotte" or browse for a native Spanish voice)
  - Returns audio stream → creates Blob URL for playback
- Implement `useAudioPlayer`:
  - Plays audio from Blob URL
  - Fires callback when playback completes
  - Handles cleanup (revoke Blob URLs)
- Implement `MicButton` with full state machine (IDLE → RECORDING → TRANSCRIBING → THINKING → SPEAKING → IDLE)
- Wire everything together in the session page
- Remove temporary text input (or keep as hidden fallback)

**Verify:** Hold mic → speak Spanish → release → see transcription appear → tutor text appears → hear tutor speak → mic becomes available again. No double audio, no stuttering, no stuck states.

### Phase 5: Polish & Edge Cases (30 min)

**Goal:** Handle everything that can go wrong gracefully.

- Error toasts for: API key expired, network failure, STT returned empty, TTS failed
- Loading states: skeleton shimmer on scenario cards, pulsing dots during thinking
- Mobile responsive: mic button thumb-friendly on mobile, chat scrolls correctly
- Keyboard accessibility: spacebar to hold mic (in addition to click)
- Auto-scroll chat to bottom on new messages
- Scenario header shows exchange count progress (e.g., "4 of ~10")
- First-visit onboarding: brief 2-line explanation of push-to-talk on first session
- Page title updates with current scenario name

**Verify:** Test on mobile browser. Test with airplane mode toggled. Test rapid mic presses. Test very long user utterances. Test user saying nothing (empty recording).

---

## 9. LLM Message Construction

Here's exactly how to build the messages array for each LLM call:

```typescript
function buildMessages(scenario: Scenario, history: Message[]): ChatMessage[] {
  return [
    {
      role: "system",
      content: TUTOR_SYSTEM_PROMPT  // The full prompt from Section 5
    },
    {
      role: "user",
      content: `
<scenario_context>
You are playing: ${scenario.tutorRole}
The user is playing: ${scenario.userRole}
Situation: ${scenario.situation}
Target exchanges: ${scenario.targetExchanges}
Key vocabulary to elicit: ${scenario.keyVocabulary.join(", ")}
Grammar focus: ${scenario.grammarFocus}
Completion trigger: ${scenario.completionTrigger}
Current exchange number: ${history.filter(m => m.role === 'user').length + 1}
</scenario_context>

${history.length === 0
  ? "Begin the scenario now with your opening line."
  : `The user just said: "${history[history.length - 1].content}"`
}
`
    },
    // Include conversation history for context
    ...history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))
  ];
}
```

**LLM Call Parameters:**

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: buildMessages(scenario, conversationHistory),
  temperature: 0.7,        // Some creativity but consistent behavior
  max_tokens: 200,         // Hard cap to enforce brevity
  presence_penalty: 0.3,   // Discourage repetition
  frequency_penalty: 0.2,  // Further discourage repetition
});
```

### Response Parsing

The tutor's response needs to be parsed into structured parts:

```typescript
interface ParsedTutorResponse {
  type: 'normal' | 'correction' | 'completion';
  spanishText?: string;          // The Spanish dialogue line
  englishText?: string;          // The English translation
  correctionExplanation?: string; // English error correction (if correction type)
  retryPrompt?: string;          // "Try again" prompt (if correction type)
  summaryText?: string;          // Session summary (if completion type)
}

function parseTutorResponse(raw: string): ParsedTutorResponse {
  // Check for scenario completion
  if (raw.includes('[SCENARIO_COMPLETE]')) {
    const [dialogue, rest] = raw.split('[SCENARIO_COMPLETE]');
    return {
      type: 'completion',
      ...parseDialogue(dialogue.trim()),
      summaryText: rest.trim().replace('Session summary: ', '')
    };
  }

  // Check for correction pattern (contains English explanation + "try" or "Try")
  // Corrections are in English with Spanish words highlighted
  // The heuristic: if the response starts with English words like "Almost", "Close", "Good try"
  const correctionStarters = ['almost', 'close', 'good try', 'not quite', 'small fix'];
  const lowerRaw = raw.toLowerCase();
  if (correctionStarters.some(s => lowerRaw.startsWith(s))) {
    return {
      type: 'correction',
      correctionExplanation: raw.split('\n')[0],
      retryPrompt: raw.split('\n').slice(1).join('\n').trim() || 'Can you try that again?'
    };
  }

  // Normal response: Spanish line + English translation in parentheses
  return {
    type: 'normal',
    ...parseDialogue(raw)
  };
}

function parseDialogue(text: string): { spanishText: string; englishText: string } {
  // Expected format:
  // "Spanish sentence here."
  // "(English translation here.)"
  const lines = text.trim().split('\n').filter(l => l.trim());
  const spanishText = lines[0]?.replace(/^[""]|[""]$/g, '').trim() || '';
  const englishLine = lines.find(l => l.trim().startsWith('('));
  const englishText = englishLine?.replace(/^\(|\)$/g, '').trim() || '';

  return { spanishText, englishText };
}
```

---

## 10. Agent Operating Docs (Source of Truth)

Agent instructions are maintained outside this spec to avoid stale duplicates.

- `AGENTS.md`: entrypoint for Codex.
- `CLAUDE.md`: entrypoint for Claude Code.
- `docs/agents/COMMON.md`: shared constraints and contracts.
- `docs/agents/CODEX.md` and `docs/agents/CLAUDE_CODE.md`: model-specific overlays.

When architecture or workflow changes, update these files in the same commit as spec changes.

This spec remains the product and implementation reference (especially Sections 3, 5, 8, and 9), while agent files define execution behavior and workflow expectations.

---

## 11. Future Enhancements (Post-MVP)

These are explicitly OUT OF SCOPE for the MVP but documented for future reference:

- **Progress tracking:** Track completed scenarios, error patterns, vocabulary mastery
- **Difficulty suggestions:** Recommend next scenario based on performance
- **Multiple languages:** Architecture should support swapping Spanish for other languages
- **Multiple dialects:** Castilian, Colombian, Argentine modes with dialect-specific vocab
- **VAD (Voice Activity Detection):** Replace push-to-talk with automatic silence detection
- **Streaming TTS:** Stream audio as LLM generates response for lower latency
- **Custom scenarios:** Let users describe a situation and generate a scenario on the fly
- **Vocabulary review:** End-of-week review of words encountered across sessions
- **OpenAI Realtime API:** Single WebSocket for STT+LLM+TTS with much lower latency
- **Mobile app:** React Native or PWA version
- **Conversation history:** Save past sessions for review

---

## Appendix A: Environment Setup

```bash
npx create-next-app@latest speakfluid --typescript --tailwind --app --src-dir
cd speakfluid
npm install openai
npm install elevenlabs                    # ElevenLabs SDK
npm install @types/dom-mediacapture-record  # TypeScript types for MediaRecorder
```

## Appendix B: API Call Examples

### STT (OpenAI gpt-4o-transcribe)
```typescript
const transcription = await openai.audio.transcriptions.create({
  model: "gpt-4o-transcribe",
  file: audioFile,           // File object from Blob
  language: "es",            // Hint: Spanish
  response_format: "text",   // Plain text, not JSON
});
```

### Chat (Tutor LLM)
```typescript
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: messages,
  temperature: 0.7,
  max_tokens: 200,
  presence_penalty: 0.3,
  frequency_penalty: 0.2,
});
```

### TTS (ElevenLabs Flash v2.5)
```typescript
// Using ElevenLabs SDK
import { ElevenLabsClient } from "elevenlabs";

const elevenlabs = new ElevenLabsClient({ apiKey: storedElevenLabsKey });

const audioStream = await elevenlabs.textToSpeech.convert(
  VOICE_ID,  // Selected Latin American Spanish voice ID
  {
    text: fullResponseText,       // Spanish + English together
    model_id: "eleven_flash_v2_5",
    output_format: "mp3_44100_128",
  }
);

// Convert stream to Blob for playback
const chunks: Uint8Array[] = [];
for await (const chunk of audioStream) {
  chunks.push(chunk);
}
const blob = new Blob(chunks, { type: "audio/mp3" });
const url = URL.createObjectURL(blob);
// Play with: new Audio(url).play()
```

### ElevenLabs API Key Validation
```typescript
// Validate ElevenLabs key by fetching user info
const response = await fetch("https://api.elevenlabs.io/v1/user", {
  headers: { "xi-api-key": apiKey }
});
const isValid = response.ok;
```

## Appendix C: Message Format Contract

Every message in the conversation history follows this type:

```typescript
type MessageRole = 'tutor' | 'user';
type MessageType = 'normal' | 'correction' | 'completion' | 'user-input' | 'user-retry';

interface Message {
  id: string;                    // Unique ID (crypto.randomUUID())
  role: MessageRole;
  type: MessageType;
  timestamp: number;
  content: string;               // Raw text content
  spanishText?: string;          // Parsed Spanish (tutor messages)
  englishText?: string;          // Parsed English translation (tutor messages)
  correctionExplanation?: string; // Error correction text (correction messages)
  summaryText?: string;          // Session summary (completion messages)
}
```
