import { describe, expect, it } from "vitest";

import { groupIntoExchanges } from "./exchanges";
import type { Message, MessageType } from "@/types";

function message(id: string, role: Message["role"], type: MessageType, content: string): Message {
  return {
    id,
    role,
    type,
    timestamp: Number(id.replace(/\D/g, "")) || 0,
    content,
  };
}

describe("groupIntoExchanges", () => {
  it("groups an opening tutor message with a user reply", () => {
    const tutorMessage = message("t1", "tutor", "normal", "Hola.");
    const userMessage = message("u1", "user", "user-input", "Hola.");

    const exchanges = groupIntoExchanges([tutorMessage, userMessage]);

    expect(exchanges).toHaveLength(1);
    expect(exchanges[0]).toMatchObject({
      id: "t1",
      index: 0,
      tutorMessage,
      userMessage,
    });
  });

  it("groups a correction and retry into the previous exchange", () => {
    const firstTutor = message("t1", "tutor", "normal", "Cuente su rutina.");
    const firstUser = message("u1", "user", "user-input", "Yo ducha.");
    const correction = message("t2", "tutor", "correction", "Try again.");
    const retry = message("u2", "user", "user-retry", "Me ducho.");
    const secondTutor = message("t3", "tutor", "normal", "Muy bien.");

    const exchanges = groupIntoExchanges([
      firstTutor,
      firstUser,
      correction,
      retry,
      secondTutor,
    ]);

    expect(exchanges).toHaveLength(2);
    expect(exchanges[0]).toMatchObject({
      tutorMessage: firstTutor,
      userMessage: firstUser,
      correction,
      userRetry: retry,
    });
    expect(exchanges[1]).toMatchObject({
      tutorMessage: secondTutor,
    });
  });

  it("starts a completion message as its own exchange", () => {
    const completion = message("t1", "tutor", "completion", "Listo.");

    const exchanges = groupIntoExchanges([completion]);

    expect(exchanges).toHaveLength(1);
    expect(exchanges[0]).toMatchObject({
      id: "t1",
      index: 0,
      tutorMessage: completion,
    });
  });

  it("overwrites a first correction when a second correction arrives", () => {
    const tutor = message("t1", "tutor", "normal", "Cuente su rutina.");
    const user = message("u1", "user", "user-input", "Yo ducha.");
    const correctionA = message("t2", "tutor", "correction", "Use me ducho.");
    const retry1 = message("u2", "user", "user-retry", "Me ducha.");
    const correctionB = message("t3", "tutor", "correction", "Use me ducho.");
    const retry2 = message("u3", "user", "user-retry", "Me ducho.");

    const exchanges = groupIntoExchanges([tutor, user, correctionA, retry1, correctionB, retry2]);

    expect(exchanges).toHaveLength(1);
    expect(exchanges[0].correction).toBe(correctionB);
    expect(exchanges[0].userRetry).toBe(retry1);
    expect(JSON.stringify(exchanges)).not.toContain(retry2.id);
    // KNOWN QUIRK: second retry dropped from UI; candidate fix tracked in plans/README.md (finding #7).
  });

  it("skips user messages that arrive before any tutor message", () => {
    const strayUser = message("u1", "user", "user-input", "Hola.");
    const tutor = message("t1", "tutor", "normal", "Hola.");

    const exchanges = groupIntoExchanges([strayUser, tutor]);

    expect(exchanges).toHaveLength(1);
    expect(exchanges[0]).toMatchObject({
      tutorMessage: tutor,
    });
    expect(exchanges[0].userMessage).toBeUndefined();
  });
});
