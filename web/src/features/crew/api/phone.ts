import { read, write, type ReadResult, type WriteResult } from "../../../lib/db";
import * as paths from "../../../lib/paths";
import type { MemberId } from "../../../types/trip";

/** A member's phone for trip texts, as stored. */
export interface SavedPhone {
  e164: string;
  at: number;
}

/**
 * Saves or removes this member's phone for trip texts. Only the member's
 * own device may write it, and the rules accept only an E.164 number;
 * friends never read it, an organizer's device does (for "Text the crew").
 *
 * Inputs: the trip, the member, and the number from toE164(), or null to remove it.
 * Output: the write result. With no connection it waits and lands later.
 * Examples (checked on the emulator):
 *   RB's device saves "+14155550123"  → tripSecrets/<trip>/phones/rb = { e164: "+14155550123", at: … }
 *   RB's device, "Remove number"      → tripSecrets/<trip>/phones/rb is gone
 */
export function savePhone(tripId: string, memberId: MemberId, e164: string | null): Promise<WriteResult> {
  return write({ [paths.phone(tripId, memberId)]: e164 ? { e164, at: Date.now() } : null });
}

/**
 * Reads this member's own phone, for the "You" sheet. It reads once, when
 * the sheet opens; the trip listener never carries tripSecrets.
 *
 * Inputs: the trip and the member.
 * Output: the saved phone (value null when none), or the failure.
 * Examples (checked on the emulator): RB's device → { ok: true, value: { e164: "+14155550123", at: … } }
 */
export function readPhone(tripId: string, memberId: MemberId): Promise<ReadResult<SavedPhone>> {
  return read<SavedPhone>(paths.phone(tripId, memberId));
}

/**
 * Reads every member's phone, for the organizer's count of who a text
 * would reach. The rules refuse it to anyone but an organizer.
 *
 * Inputs: the trip.
 * Output: member id to saved phone (value null when nobody added one), or the failure.
 * Examples (checked on the emulator): an organizer → { ok: true, value: { rb: {…}, lc: {…} } }; a friend → refused
 */
export function readPhones(tripId: string): Promise<ReadResult<Record<MemberId, SavedPhone>>> {
  return read<Record<MemberId, SavedPhone>>(paths.phones(tripId));
}
