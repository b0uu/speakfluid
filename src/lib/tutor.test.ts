import { describe, expect, it } from "vitest";

import { buildTutorSpeechText, parseTutorResponse } from "./tutor";
// things like \u00BF are for unique characters like upside down question marks
describe("parseTutorResponse", () => {
  it("parses a normal turn", () => {
    const result = parseTutorResponse(
      '"\u00BFYa sabe que quiere tomar?"\n(Do you know what you\'d like to drink?)'
    );

    expect(result).toMatchObject({
      type: "normal",
      spanishText: "\u00BFYa sabe que quiere tomar?",
      englishText: "Do you know what you'd like to drink?",
    });
  });

  it("strips curly quotes from a normal turn", () => {
    const result = parseTutorResponse(
      "\u201C\u00BFQue va a pedir?\u201D\n(What are you going to order?)"
    );

    expect(result).toMatchObject({
      type: "normal",
      spanishText: "\u00BFQue va a pedir?",
      englishText: "What are you going to order?",
    });
  });

  it("extracts a narrator line from a normal turn", () => {
    const result = parseTutorResponse(
      '[NARRATOR] Carlos leans forward.\n"\u00BFDe donde eres?"\n(Where are you from?)'
    );

    expect(result).toMatchObject({
      type: "normal",
      narratorText: "Carlos leans forward.",
      spanishText: "\u00BFDe donde eres?",
      englishText: "Where are you from?",
    });
  });

  it("joins two Spanish lines before the English line", () => {
    const result = parseTutorResponse(
      '"Buenos dias."\n"\u00BFQuiere una mesa afuera?"\n(Good morning. Do you want a table outside?)'
    );

    expect(result).toMatchObject({
      type: "normal",
      spanishText: "Buenos dias. \u00BFQuiere una mesa afuera?",
      englishText: "Good morning. Do you want a table outside?",
    });
  });

  it("parses a canonical correction", () => {
    const result = parseTutorResponse(
      'You meant to say "Me ducho y despues tomo un cafe."\nTry again: "Me ducho y despues tomo un cafe."'
    );

    expect(result).toMatchObject({
      type: "correction",
      correctionExplanation: 'You meant to say "Me ducho y despues tomo un cafe."',
      correctionTarget: "Me ducho y despues tomo un cafe.",
      retryPrompt: 'Try again: "Me ducho y despues tomo un cafe."',
    });
  });

  it("parses a correction from a starter word", () => {
    const result = parseTutorResponse(
      'Almost! Use the reflexive form: "Me despierto a las siete."\nTry again: "Me despierto a las siete."'
    );

    expect(result).toMatchObject({
      type: "correction",
      correctionTarget: "Me despierto a las siete.",
      retryPrompt: 'Try again: "Me despierto a las siete."',
    });
  });

  it("parses a correction with no quoted segment", () => {
    const result = parseTutorResponse(
      "Not quite - you need the reflexive form.\nTry again: say it one more time."
    );

    expect(result).toMatchObject({
      type: "correction",
      correctionExplanation: "Not quite - you need the reflexive form.",
      retryPrompt: "Try again: say it one more time.",
    });
    expect(result.correctionTarget).toBeUndefined();
  });

  it("uses a fallback retry prompt when a correction has no retry line", () => {
    const result = parseTutorResponse('Small fix: say "Me llamo Ana."');

    expect(result).toMatchObject({
      type: "correction",
      correctionExplanation: 'Small fix: say "Me llamo Ana."',
      correctionTarget: "Me llamo Ana.",
      retryPrompt: "Try again: say it one more time.",
    });
  });

  it("parses a completion with dialogue and summary", () => {
    const result = parseTutorResponse(
      '"Perfecto, su mesa esta lista."\n(Perfect, your table is ready.)\n[SCENARIO_COMPLETE]\nSession summary: You practiced ordering food.'
    );

    expect(result).toMatchObject({
      type: "completion",
      spanishText: "Perfecto, su mesa esta lista.",
      englishText: "Perfect, your table is ready.",
      summaryText: "You practiced ordering food.",
    });
  });

  it("parses a completion with no preceding dialogue", () => {
    const result = parseTutorResponse(
      "[SCENARIO_COMPLETE]\nSession summary: You practiced introductions."
    );

    expect(result).toMatchObject({
      type: "completion",
      spanishText: "",
      englishText: "",
      summaryText: "You practiced introductions.",
    });
  });

  it("parses plain text without parentheses as a normal turn", () => {
    const result = parseTutorResponse("Hola, mucho gusto.");

    expect(result).toMatchObject({
      type: "normal",
      spanishText: "Hola, mucho gusto.",
      englishText: "",
    });
  });
});

describe("buildTutorSpeechText", () => {
  it("returns the correction target for corrections with a target", () => {
    const raw =
      'You meant to say "Me ducho y despues tomo un cafe."\nTry again: "Me ducho y despues tomo un cafe."';
    const parsed = parseTutorResponse(raw);

    expect(buildTutorSpeechText(raw, parsed)).toBe("Me ducho y despues tomo un cafe.");
  });

  it("returns Spanish text for normal turns", () => {
    const raw = '"\u00BFYa sabe que quiere tomar?"\n(Do you know what you want to drink?)';
    const parsed = parseTutorResponse(raw);

    expect(buildTutorSpeechText(raw, parsed)).toBe("\u00BFYa sabe que quiere tomar?");
  });

  it("returns the raw correction text when no correction target exists", () => {
    const raw = "Not quite - you need the reflexive form.\nTry again: say it one more time.";
    const parsed = parseTutorResponse(raw);

    // KNOWN QUIRK: speaks English; fixed by plan 004 - update this assertion then.
    expect(buildTutorSpeechText(raw, parsed)).toBe(raw);
  });

  it("strips a narrator-only response down to empty speech text", () => {
    const raw = "[NARRATOR] Carlos leans forward.";
    const parsed = parseTutorResponse(raw);

    expect(parsed.spanishText).toBe("");
    expect(buildTutorSpeechText(raw, parsed)).toBe("");
  });
});
