import type { Scenario, Message, ParsedTutorResponse } from "@/types";
import { createOpenAIClient } from "./openai";

const TUTOR_SYSTEM_PROMPT = `You are the tutor in SpeakFluid, a conversational Spanish practice app. You are currently playing a specific character in a scenario to help the user practice speaking Spanish.

<core_identity>
Your name and role change per scenario (provided in the scenario context). You speak Latin American Spanish. You are warm, patient, encouraging, and you guide the conversation actively - the user should never feel lost or unsure what to say next.
</core_identity>

<conversation_rules>
CRITICAL RULES - follow these exactly:

1. YOUR LINES MUST BE SHORT. Maximum 2 sentences in Spanish per turn. This is non-negotiable. The user needs to be able to process and respond to what you say. Long tutor turns are the #1 UX failure.

2. YOU drive the conversation. Always end your turn with a specific question or prompt that tells the user exactly what to say next. Never give open-ended questions like "¿Qué más?" or "Cuéntame más." Instead, ask targeted questions like "¿Y a qué hora llegaste?" or "¿Prefieres la playa o el cine?"

3. Keep the conversation moving toward the scenario's completion goal. You know approximately how many exchanges this scenario should take. Pace accordingly - don't rush, but don't let the conversation stall or loop.

4. Be a character, not a teacher. Stay in your role. If you're a waiter, act like a waiter. If you're a friend, act like a friend. The teaching happens through the conversation, not despite it.

5. When the scenario's completion goal has been met, wrap up naturally in-character and then add on a new line: [SCENARIO_COMPLETE]
</conversation_rules>

<narrator_directions>
You may optionally include a brief third-person narrator line before your dialogue. This creates an immersive roleplay atmosphere.

Format: Start the line with [NARRATOR] followed by a short scene description.

Example:
[NARRATOR] Carlos leans forward with interest.
"¿Y de dónde eres?"
(And where are you from?)

Rules:
- Maximum 1 sentence, under 15 words
- Third person, present tense ("Carlos smiles", not "I smile")
- Describe a physical action, facial expression, or environmental detail
- Use sparingly: roughly every 2-3 turns, NOT every turn
- NEVER include on correction turns
- NEVER include on the first turn (the scene intro handles that)
- This line is for visual display only and will not be spoken aloud
</narrator_directions>

<error_correction_protocol>
When the user makes a grammatical or vocabulary error:

1. First, briefly acknowledge what they were trying to say so they feel heard.
2. Provide the correction FULLY IN ENGLISH. Highlight the specific Spanish word or phrase they got wrong and show the correct form.
3. Ask them to try the corrected sentence again.
4. When they say it correctly (or close enough), praise them briefly IN SPANISH and then continue the scenario conversation IN SPANISH with a new question.

IMPORTANT:
- Correct a maximum of ONE error per turn. If they make multiple errors, correct the most important one and let the others go.
- If the error is minor and meaning is clear, you may skip correction entirely and just continue the conversation.
- The English correction should be 1-2 sentences max. Do not lecture.
- The correction line MUST be in English. The only Spanish allowed on that line is the quoted corrected phrase or sentence.
- Do NOT start correction turns with Spanish phrases like "Buen intento" or "Debes decir".
- Put the corrected Spanish word, phrase, or sentence in double quotes.
- Start the retry line with "Try again:" and include the full corrected Spanish sentence in double quotes when possible.
- After correction and retry, ALWAYS switch back to Spanish for the next scenario question.
</error_correction_protocol>

<bilingual_output_format>
Your responses must follow this exact format for every turn:

If you include a narrator line, it comes FIRST, before your Spanish dialogue:

[NARRATOR] Scene description here.
"Spanish dialogue here."
(English translation here.)

SPANISH LINE(S): Your in-character dialogue in Spanish (1-2 sentences max).
ENGLISH LINE: A natural English translation of what you just said, in parentheses on the next line.

Example:
"¿Ya sabe qué quiere tomar, o necesita un momento?"
(Do you know what you'd like to drink, or do you need a moment?)

When doing error correction, the format changes:
Line 1: Brief explanation + correct form
Line 2: Try again: "corrected Spanish sentence"

Do NOT include literal labels like "ENGLISH CORRECTION:" or "RETRY PROMPT:" in the final output.

Correction example:
You meant to say "Me ducho y después de tomar un café."
Try again: "Me ducho y después de tomar un café."

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
</pacing_and_completion>

<what_not_to_do>
- Do NOT give long explanations of grammar rules
- Do NOT list vocabulary words
- Do NOT break character to give meta-commentary about the lesson
- Do NOT ask "¿Entiendes?" or "¿Tiene sentido?" - just move forward
- Do NOT repeat the same question if the user answered it
- Do NOT use formal usted unless the scenario specifically calls for it
- Do NOT output more than 3 lines of text total per turn (Spanish + English translation, or correction + retry prompt)
</what_not_to_do>

<handling_edge_cases>
- If user responds in English: Gently prompt them to try in Spanish. Say: "¡Inténtalo en español! Try saying: [give them a starter phrase]."
- If user says something off-topic: Briefly acknowledge, then steer back.
- If user says "I don't know" or seems stuck: Give them a scaffold. "No te preocupes. Try saying: 'Yo...' and then tell me [specific thing]."
- If user's response is too short (just one word): Accept it, but prompt expansion.
- If user is doing very well: Slightly increase complexity.
</handling_edge_cases>`;

const NARRATOR_LINE_REGEX = /^\[NARRATOR\]\s*(.+?)$/m;
const CORRECTION_STARTERS = [
  "almost",
  "close",
  "good try",
  "not quite",
  "small fix",
  "nice try",
  "great effort",
];

function buildMessages(
  scenario: Scenario,
  history: Message[]
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const userExchanges = history.filter((message) => message.role === "user").length;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: TUTOR_SYSTEM_PROMPT },
    {
      role: "user",
      content: `<scenario_context>
You are playing: ${scenario.tutorRole}
The user is playing: ${scenario.userRole}
Situation: ${scenario.situation}
Target exchanges: ${scenario.targetExchanges}
Key vocabulary to elicit: ${scenario.keyVocabulary.join(", ")}
Grammar focus: ${scenario.grammarFocus}
Completion trigger: ${scenario.completionTrigger}
Current exchange number: ${userExchanges + 1}
</scenario_context>

${
  history.length === 0
    ? "Begin the scenario now with your opening line."
    : "Continue the conversation. The user just spoke."
}`,
    },
  ];

  for (const message of history) {
    messages.push({
      role: message.role === "tutor" ? "assistant" : "user",
      content: message.content,
    });
  }

  return messages;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function cleanDialogueLine(line: string): string {
  return line.replace(/^[""\u201C]|[""\u201D]$/g, "").trim();
}

function cleanEnglishLine(line: string): string {
  return line.replace(/^\(|\)$/g, "").trim();
}

function stripNarratorLine(raw: string): string {
  return raw.replace(NARRATOR_LINE_REGEX, "").trim();
}

function extractQuotedSegments(text: string): string[] {
  const segments: string[] = [];
  const regex = /[""\u201C]([^""\u201D]+)[""\u201D]/g;
  let match: RegExpExecArray | null = regex.exec(text);

  while (match) {
    const segment = normalizeWhitespace(match[1].replace(/\*\*/g, ""));
    if (segment) {
      segments.push(segment);
    }
    match = regex.exec(text);
  }

  return segments;
}

function splitCorrectionText(text: string): {
  correctionExplanation: string;
  retryPrompt: string;
} {
  const normalizedText = text
    .replace(/^\s*ENGLISH CORRECTION:\s*/i, "")
    .replace(/\s*RETRY PROMPT:\s*/i, "\n")
    .trim();

  const inlineRetryMatch = normalizedText.match(/\bTry again:\s*.+$/i);
  if (inlineRetryMatch) {
    const correctionExplanation = normalizeWhitespace(
      normalizedText.slice(0, inlineRetryMatch.index).trim()
    );
    const retryPrompt = normalizeWhitespace(inlineRetryMatch[0]);

    return {
      correctionExplanation,
      retryPrompt,
    };
  }

  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const retryIndex = lines.findIndex((line) =>
    /^(try again|say|now say|repeat|give it another try)/i.test(line)
  );

  if (retryIndex !== -1) {
    return {
      correctionExplanation: normalizeWhitespace(lines.slice(0, retryIndex).join(" ")),
      retryPrompt: normalizeWhitespace(lines.slice(retryIndex).join(" ")),
    };
  }

  return {
    correctionExplanation: normalizeWhitespace(lines[0] || normalizedText),
    retryPrompt:
      normalizeWhitespace(lines.slice(1).join(" ")) || "Try again: say it one more time.",
  };
}

function extractCorrectionTarget(
  correctionExplanation: string,
  retryPrompt: string
): string | undefined {
  const quotedSegments = extractQuotedSegments(`${retryPrompt}\n${correctionExplanation}`);

  if (quotedSegments.length === 0) {
    return undefined;
  }

  return quotedSegments.sort((a, b) => b.length - a.length)[0];
}

function normalizeCorrectionExplanation(
  correctionExplanation: string,
  correctionTarget?: string
): string {
  if (!correctionTarget) {
    return correctionExplanation;
  }

  const lowerExplanation = correctionExplanation.toLowerCase();
  const looksSpanish =
    /[¡¿áéíóúñ]/i.test(correctionExplanation) ||
    /\b(buen intento|debes decir|intenta otra vez|pero debes)\b/i.test(lowerExplanation);

  if (looksSpanish) {
    return `You meant to say "${correctionTarget}".`;
  }

  return correctionExplanation;
}

function isCorrectionResponse(text: string): boolean {
  const lowerText = text.toLowerCase().trimStart();

  return (
    CORRECTION_STARTERS.some((starter) => lowerText.startsWith(starter)) ||
    lowerText.startsWith("english correction:") ||
    lowerText.includes("retry prompt:") ||
    /^(try again|say|now say|repeat|give it another try)/im.test(text) ||
    /correct form|instead of|not ".+?"[,]?\s+say/i.test(text)
  );
}

function parseDialogue(text: string): { spanishText: string; englishText: string } {
  const lines = text
    .trim()
    .split("\n")
    .filter((line) => line.trim());

  const englishIdx = lines.findIndex((line) => line.trim().startsWith("("));

  if (englishIdx !== -1) {
    return {
      spanishText: lines
        .slice(0, englishIdx)
        .map(cleanDialogueLine)
        .filter(Boolean)
        .join(" ")
        .trim(),
      englishText: lines
        .slice(englishIdx)
        .filter((line) => line.trim().startsWith("("))
        .map(cleanEnglishLine)
        .filter(Boolean)
        .join(" ")
        .trim(),
    };
  }

  return {
    spanishText: cleanDialogueLine(lines[0] || text.trim()),
    englishText: "",
  };
}

export async function sendToTutor(
  scenario: Scenario,
  history: Message[],
  apiKey: string
): Promise<string> {
  const client = createOpenAIClient(apiKey);
  const messages = buildMessages(scenario, history);

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.7,
    max_tokens: 250,
    presence_penalty: 0.3,
    frequency_penalty: 0.2,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

export function parseTutorResponse(raw: string): ParsedTutorResponse {
  let narratorText: string | undefined;
  let remaining = raw;

  const narratorMatch = raw.match(NARRATOR_LINE_REGEX);
  if (narratorMatch) {
    narratorText = narratorMatch[1].trim();
    remaining = stripNarratorLine(raw);
  }

  if (remaining.includes("[SCENARIO_COMPLETE]")) {
    const [dialogue, rest] = remaining.split("[SCENARIO_COMPLETE]");
    const summaryText = (rest || "").trim().replace(/^Session summary:\s*/i, "");

    return {
      type: "completion",
      ...parseDialogue(dialogue.trim()),
      summaryText,
      narratorText,
    };
  }

  if (isCorrectionResponse(remaining)) {
    const { correctionExplanation, retryPrompt } = splitCorrectionText(remaining);
    const correctionTarget = extractCorrectionTarget(correctionExplanation, retryPrompt);

    return {
      type: "correction",
      correctionExplanation: normalizeCorrectionExplanation(
        correctionExplanation,
        correctionTarget
      ),
      correctionTarget,
      retryPrompt,
    };
  }

  return {
    type: "normal",
    ...parseDialogue(remaining),
    narratorText,
  };
}

export function buildTutorSpeechText(raw: string, parsed: ParsedTutorResponse): string {
  if (parsed.type === "correction" && parsed.correctionTarget) {
    return parsed.correctionTarget;
  }

  if (parsed.spanishText?.trim()) {
    return parsed.spanishText.trim();
  }

  return stripNarratorLine(raw);
}
