import type { Message, Exchange } from "@/types";

/**
 * Group a flat messages array into Exchange objects.
 * Each tutor message with type 'normal' or 'completion' starts a new exchange.
 * Subsequent user-input, correction, and user-retry messages are grouped
 * into the same exchange.
 */
export function groupIntoExchanges(messages: Message[]): Exchange[] {
  const exchanges: Exchange[] = [];
  let current: Exchange | null = null;

  for (const msg of messages) {
    if (msg.role === "tutor" && (msg.type === "normal" || msg.type === "completion")) {
      // Start a new exchange
      current = {
        id: msg.id,
        index: exchanges.length,
        tutorMessage: msg,
        narratorText: msg.narratorText,
      };
      exchanges.push(current);
    } else if (msg.role === "tutor" && msg.type === "correction") {
      // Attach correction to the current exchange
      if (current) {
        current.correction = msg;
      }
    } else if (msg.role === "user") {
      if (!current) continue;

      if (current.correction && !current.userRetry) {
        // User is retrying after a correction
        current.userRetry = msg;
      } else if (!current.userMessage) {
        // First user response in this exchange
        current.userMessage = msg;
      }
    }
  }

  return exchanges;
}
