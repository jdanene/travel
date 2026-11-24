import { write, writeOnce, type WriteResult } from "../../../lib/db";
import * as paths from "../../../lib/paths";
import type { Answer, MemberId } from "../../../types/trip";

/**
 * Saves a member's answer to one date option; a new answer replaces the
 * old one, and the counts move at once on every phone (case 10).
 * Inputs: the trip, the option, the member, the answer.
 * Output: the write result.
 * Examples (checked on the emulator): RB taps "Maybe" on 13–23 Feb → dates/answers/<option>/rb = "maybe"
 */
export function saveAnswer(tripId: string, optionId: string, memberId: MemberId, answer: Answer): Promise<WriteResult> {
  return write({ [paths.answer(tripId, optionId, memberId)]: answer });
}

/**
 * Confirms one date option, for everyone. Only an organizer may; the first
 * confirm wins (case 11), and an option nobody said yes to is allowed
 * (case 12).
 * Inputs: the trip, the option, the organizer's member.
 * Output: { ok: true, won } or the refusal.
 * Examples (checked on the emulator): the organizer confirms 13–23 Feb → the Stay button appears on every phone
 */
export function confirmDates(tripId: string, optionId: string, by: MemberId) {
  return writeOnce(paths.datesConfirmed(tripId), { optionId, by, at: Date.now() });
}

/**
 * Undoes the date confirm: the Stay button goes again, with its data kept
 * (case 42). Only an organizer may.
 * Inputs: the trip.
 * Output: the write result.
 * Examples (checked on the emulator): "Change the dates" → the Dates button reads "Tap to answer" again
 */
export function undoDates(tripId: string): Promise<WriteResult> {
  return write({ [paths.datesConfirmed(tripId)]: null });
}
