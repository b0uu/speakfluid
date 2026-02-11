# SpeakFluid

Conversation-focused AI tutor. Guided voice practice in a target language, with tutoring logic geared toward beginner-intermediate speakers (~A2-B2). Guided situational conversations to improve real comprehension and communication.

## Documentation Map

- `SPEAKFLUID_SPEC.md`: Product and implementation specification.
- `AGENTS.md`: Codex-oriented execution instructions.
- `CLAUDE.md`: Claude Code-oriented execution instructions.
- `docs/agents/COMMON.md`: Shared non-negotiable constraints for all coding agents.
- `docs/agents/SOURCES.md`: Official OpenAI/Anthropic references used to shape agent docs.

# Purpose

After going through the motions of mandatory middle & high school Spanish classes, like many of my peers, I felt that I hadn't retained most of what I had learned. More recently, I had become especially motivated to go back and learn through brute force. 

I made a TikTok account solely for spanish videos to replace my original 'brainrot' account, I had made Anki flashcards to learn the commonly used vocab & idioms, and I began consuming more and more content in Spanish in an attempt to immerse myself. Overall, this had immensely improved my comprehension of Spanish. However, I quickly realized that I would need to practice my speech in order to approach fluency.

While a real tutor will be able to teach and connect with you better than an AI model can, I felt that it would be helpful to have an on-demand AI tutor that could supplement alternative methods of learning.

# Hurdles

This isn't my first attempt at building something like this. When I first tried to make an app like this, I thought it would be extremely simple: plug in speech to text API, send it to a prompted LLM, and return response through text to speech.

When I tried that, it worked, but everything executed like trash. There were countless errors with varied user input, high delays from speech to response, and more. There was doubled audio, cut-off responses, or looped LLM responses. This prompted me to reevaluate my approach.

I learned about more sophisticated Voice Activity Detection, or VAD, which could reliably detect when someone is speaking and differentiate between user voice and other noises. 

I also learned more about personalizing an LLM to a certain goal. Sometimes it was very hard to tailor the LLM to have helpful tutor tendencies, and oftentimes it felt very unnatural despite prompting it “you’re a tutor” over and over. I learned that you need a very specific and constrained system prompt, which I will continue to iterate as I test this app more and more.

TTS quality is also crucial for a conversational flow, especially when the user isn’t familiar with the spoken language, as they will attempt to mimic pronunciation of the TTS. 

I also came across many issues with STT when the speech was mixed between English and Spanish, which requires implicit differentiation of speech language and is a crucial issue to address.

These lessons that I have learned, and more, have been implemented into the project spec in order to reinforce positive design implementations rather than messy and ineffective decisions. 

# How It Works

1. Enter your API keys (OpenAI + ElevenLabs) — stored locally in your browser, never sent to any server
2. Pick a conversation scenario from the menu
3. The tutor opens the conversation in-character, in Spanish (with English translation)
4. Hold the mic button and respond in Spanish
5. The tutor corrects mistakes, asks you to retry, then continues the conversation
6. Complete the scenario in ~8-12 exchanges
7. See a summary of what you practiced, then move to the next scenario

### MVP Scenarios

| Scenario | Difficulty | What You Practice |
|----------|-----------|-------------------|
| Meeting Someone New | Beginner | Present tense, introductions |
| Ordering at a Restaurant | Beginner | Polite requests, food vocabulary |
| Your Daily Routine | Beginner | Reflexive verbs, time expressions |
| What Did You Do Last Weekend? | Intermediate | Preterite tense, narration |
| Finding Your Way | Intermediate | Imperative commands, directions |
| Shopping at a Market | Intermediate | Numbers, prices, negotiation |
| Making Plans With a Friend | Intermediate | Conditional, preferences |
| Talking About Your Family | Advanced | Descriptions, ser vs estar |

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Framework | Next.js 14 (App Router) | React-based, Vercel deployment, TypeScript |
| STT | OpenAI `gpt-4o-transcribe` | Lower error rate than Whisper, strong Spanish support |
| Tutor Brain | OpenAI `gpt-4o-mini` | Fast, cheap, good instruction following for short structured outputs |
| TTS | ElevenLabs Flash v2.5 | Best-in-class Spanish pronunciation, sub-100ms latency, natural bilingual prosody |
| Styling | Tailwind CSS | Custom design tokens, warm Latin-inspired palette — no AI-slop defaults |
| Deploy | Vercel | Auto-deploy from GitHub, free tier |

# Development Approach

This project is built with the assistance of AI coding tools. (Trying to maximize my student benefits)

Important architectural design decisions and UI/UX features still require lots of human input in order to receive great results.

Models: Opus 4.5/4.6, GPT-5.2-Codex, GPT-5.3-Codex
Tools: Claude Code, Codex, Antigravity, Cursor

This time I’m making a more conscious effort to build on a public repository with commit history reflecting the development process more accurately.

## AI Agent Usage

For best coding-agent performance:
- Codex reads `AGENTS.md` first.
- Claude Code reads `CLAUDE.md` first.
- Both should align to `docs/agents/COMMON.md` and the architecture in `SPEAKFLUID_SPEC.md`.

If these files ever conflict, update them together in one change.

## Running Locally

```bash
git clone https://github.com/b0uu/speakfluid.git
cd speakfluid
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and enter your API keys:
- **OpenAI API key** (https://platform.openai.com/api-keys)
- **ElevenLabs API key** (https://elevenlabs.io/app/settings/api-keys)

API keys are stored in browser localStorage and are never sent to any backend.

## Roadmap

- Progress tracking across sessions
- Difficulty recommendations based on performance
- Custom user-defined scenarios
- Additional languages
- OpenAI Realtime API for lower latency
- Mobile app (maybe)

## License

MIT
