import OpenAI from "openai";

export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

/** Validate key by listing models — returns true if the key is valid. */
export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const client = createOpenAIClient(apiKey);
    await client.models.list();
    return true;
  } catch {
    return false;
  }
}
