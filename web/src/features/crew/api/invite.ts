import { write, type WriteResult } from "../../../lib/db";
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
