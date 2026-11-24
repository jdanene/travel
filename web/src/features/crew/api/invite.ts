import { write, type WriteFailure, type WriteResult } from "../../../lib/db";
import * as paths from "../../../lib/paths";

/**
 * Saves the invite title, the name in the link preview. Only an organizer's
 * device may; the rules also hold it to 1 to 60 characters.
 *
 * Inputs: the trip and the title, already trimmed.
 * Output: the write result. With no connection it waits and lands later.
 * Examples (checked on the emulator):
 *   the organizer saves "Bali & Koh Phangan 2027" → info/inviteTitle holds it; the sheet opens with it next time
 *   a friend's device                              → { ok: false, reason: "refused" } (the friend never sees the control)
 */
export function saveInviteTitle(tripId: string, title: string): Promise<WriteResult> {
  return write({ [paths.inviteTitle(tripId)]: title });
}

/** The organizer key's letters and length, as scripts/create-trip.mjs makes its key. */
const KEY_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const KEY_LENGTH = 24;

/**
 * Makes a new organizer key for "Add an organizer" and saves it, so its
 * link makes a co-organizer. Only an organizer's device may write one; the
 * rules accept a new key only, so no write can change or remove another.
 * Nothing reads the keys back, so the page shows the new key alone.
 *
 * Inputs: the trip.
 * Output: { ok: true, key } once the key is saved, or the write's failure.
 * With no connection it waits and lands later.
 * Examples (checked on the emulator):
 *   the organizer taps "Make an organizer link" → tripSecrets/{trip}/organizerKey/{24 letters} = true; its link makes a new organizer
 *   a friend's device                           → { ok: false, reason: "refused" } (the friend never sees the control)
 */
export async function addOrganizerKey(tripId: string): Promise<{ ok: true; key: string } | { ok: false; reason: WriteFailure }> {
  const bytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));
  const key = Array.from(bytes, (byte) => KEY_LETTERS[byte % KEY_LETTERS.length]).join("");
  const result = await write({ [paths.organizerKey(tripId, key)]: true });
  return result.ok ? { ok: true, key } : result;
}
