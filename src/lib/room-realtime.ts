import "server-only";
import * as Ably from "ably";

export const roomChannel = (code: string) => `quizverse:room:${code.toUpperCase()}`;

let rest: Ably.Rest | undefined;
export function ablyRest(): Ably.Rest | null {
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  if (!rest) rest = new Ably.Rest({ key });
  return rest;
}

/** Notify subscribers only. The event never contains private answers or authority to mutate data. */
export async function notifyRoom(code: string): Promise<void> {
  const client = ablyRest();
  if (!client) return;
  try {
    await client.channels.get(roomChannel(code)).publish("changed", { at: Date.now() });
  } catch (error) {
    // Mutations have already committed in Turso: a transient Ably outage must not undo them.
    console.error("Ably room notification failed", error);
  }
}
