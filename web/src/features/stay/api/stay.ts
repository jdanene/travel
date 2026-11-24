import { write, writeOnce, type WriteResult } from "../../../lib/db";
import * as paths from "../../../lib/paths";
import type { MemberId, StayOption } from "../../../types/trip";

/**
 * Adds a stay option under its id. The rules refuse a second write to the
 * same id, so when two friends add one listing at once the first keeps
 * "added by" and the second is told it is a duplicate (case 17).
 * Inputs: the trip, the stay id (stayId()), and the option.
 * Output: the write result; "refused" here means the listing is already there.
 * Examples (checked on the emulator): RB adds an Airbnb room → a new card "added by RB" on every phone
 */
export function addStay(tripId: string, id: string, option: StayOption): Promise<WriteResult> {
  return write({ [paths.stayOption(tripId, id)]: option });
}

/**
 * Sets or clears this member's heart. It shows at once and sends when the
 * connection allows; a refusal flips it back (case 19).
 * Inputs: the trip, the stay, the member, and whether the heart is on.
 * Output: the write result.
 * Examples (checked on the emulator): a tap on an empty heart → the count goes up by one everywhere
 */
export function setHeart(tripId: string, id: string, memberId: MemberId, on: boolean): Promise<WriteResult> {
  return write({ [paths.heart(tripId, id, memberId)]: on ? true : null });
}

/**
 * Confirms one stay for its destination; the first organizer wins (case 20).
 * Inputs: the trip, the destination, the stay, the organizer's member.
 * Output: { ok: true, won } or the refusal.
 * Examples (checked on the emulator): "Confirm this stay" → the Stay button reads "Cliffside villa · confirmed"
 */
export function confirmStay(tripId: string, destination: string, id: string, by: MemberId) {
  return writeOnce(paths.stayConfirmed(tripId, destination), { stayId: id, by, at: Date.now() });
}

/**
 * Undoes the stay confirm of one destination. Only an organizer may.
 * Inputs: the trip and the destination.
 * Output: the write result.
 * Examples (checked on the emulator): "Change the stay" → the destination is open to hearts and a confirm again
 */
export function undoStay(tripId: string, destination: string): Promise<WriteResult> {
  return write({ [paths.stayConfirmed(tripId, destination)]: null });
}
