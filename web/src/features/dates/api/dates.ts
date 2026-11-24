import { write, writeOnce, type WriteResult } from "../../../lib/db";
import { dateOptionId } from "../../../lib/ids";
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
 * Adds a date option from "Add dates", for everyone, with the adder's vote
 * set to Yes, in one write, so the option never shows without its first
 * yes. The id comes from the two days, so a range that is listed already
 * adds nothing: the friend's vote on it is set to Yes instead.
 * Inputs: the trip, the two days (checked by checkDates first), the
 * adder's member, and whether that option exists already.
 * Output: the write result.
 * Examples (checked on the emulator):
 *   KA adds 18–24 Feb   → dates/options/2027-02-18_2027-02-24 { from, to, addedBy: "ka", at } and answers/…/ka = "yes"
 *   RB adds 13–23 Feb, listed already → answers/2027-02-13_2027-02-23/rb = "yes"; no new option
 */
export function addOption(tripId: string, from: string, to: string, memberId: MemberId, listed: boolean): Promise<WriteResult> {
  const id = dateOptionId(from, to);
  const vote = { [paths.answer(tripId, id, memberId)]: "yes" };
  if (listed) return write(vote);
  return write({ [paths.dateOption(tripId, id)]: { from, to, addedBy: memberId, at: Date.now() }, ...vote });
}

/**
 * Removes a date option and its answers in one write. The page offers it
 * to the adder and to an organizer only while nobody but the adder has
 * voted on it and it is not the confirmed option; the rules hold the
 * last two (adder or organizer, not confirmed).
 * Inputs: the trip and the option.
 * Output: the write result.
 * Examples (checked on the emulator): KA removes 18–24 Feb → the option and its "yes" go for everyone
 */
export function removeOption(tripId: string, optionId: string): Promise<WriteResult> {
  return write({ [paths.dateOption(tripId, optionId)]: null, [paths.optionAnswers(tripId, optionId)]: null });
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
