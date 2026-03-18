import { createOpenAIClient } from "./openai";

/** Transcribe audio blob using OpenAI gpt-4o-transcribe. */
export async function transcribeAudio(
  blob: Blob,
  apiKey: string
): Promise<string> {
  const client = createOpenAIClient(apiKey);

  // Convert Blob to File (required by the OpenAI SDK)
  const file = new File([blob], "recording.webm", { type: blob.type });

  const transcription = await client.audio.transcriptions.create({
    model: "gpt-4o-transcribe",
    file,
    language: "es",
    response_format: "text",
  });

  // The SDK returns a string when response_format is "text"
  return (typeof transcription === "string"
    ? transcription
    : (transcription as unknown as { text: string }).text
  ).trim();
}
