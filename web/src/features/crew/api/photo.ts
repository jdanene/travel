import { write, type WriteResult } from "../../../lib/db";
import * as paths from "../../../lib/paths";

/**
 * Saves or removes a member's photo. Only the member's own device may: the
 * member rule covers the node, and the rules check the photo's form.
 *
 * Inputs: the trip, the member, and the photo, or null to remove it.
 * Output: the write result. With no connection it waits and lands later.
 * Examples (checked on the emulator):
 *   RB's device saves a photo  → members/rb/photo = "data:image/jpeg;base64,…"; RB's circle shows it everywhere
 *   RB's device removes it     → members/rb/photo is gone; the circle shows "RB" again
 */
export function savePhoto(tripId: string, memberId: string, url: string | null): Promise<WriteResult> {
  return write({ [paths.memberField(tripId, memberId, "photo")]: url });
}
