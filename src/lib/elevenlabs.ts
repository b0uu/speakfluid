/** Validate ElevenLabs key by fetching /v1/user. */
export async function validateElevenLabsKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}
