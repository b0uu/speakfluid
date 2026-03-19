// Latin American Spanish voice — "Laura" is a common ElevenLabs voice with good Spanish.
// Users can change this by editing the constant.
const VOICE_ID = "FGY2WhTYpPnrIDTdsKH5"; // "Laura" on ElevenLabs

/** Synthesize speech using ElevenLabs Flash v2.5. Returns a blob URL for playback. */
export async function synthesizeSpeech(
  text: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        language_code: "es",
        output_format: "mp3_44100_128",
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.8,
          style: 0.0,
          speed: 0.95,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`TTS failed: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: "audio/mp3" });
  return URL.createObjectURL(blob);
}
