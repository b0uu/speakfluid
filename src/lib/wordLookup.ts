import { createOpenAIClient } from "./openai";

const definitionCache = new Map<string, string>();

export async function lookupWord(
  word: string,
  sentenceContext: string,
  apiKey: string
): Promise<string> {
  const cacheKey = word.toLowerCase();

  if (definitionCache.has(cacheKey)) {
    return definitionCache.get(cacheKey)!;
  }

  const client = createOpenAIClient(apiKey);

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a Spanish-English dictionary. Given a Spanish word and the sentence it appears in, provide a brief English definition (1-5 words). Account for conjugation and context. Reply with ONLY the definition, nothing else.",
      },
      {
        role: "user",
        content: `Word: "${word}"\nSentence: "${sentenceContext}"`,
      },
    ],
    temperature: 0,
    max_tokens: 20,
  });

  const definition = response.choices[0]?.message?.content?.trim() || "\u2014";
  definitionCache.set(cacheKey, definition);
  return definition;
}
