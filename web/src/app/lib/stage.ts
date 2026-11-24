import type { MemberId, Trip } from "../../types/trip";

/** The block that leads the page. */
export type Stage = "dates" | "stay" | "parties" | "allSet";

/**
 * Says whether the dates are settled: a confirmed date option that still
 * exists. Stay shows only after this (owner, 23 Nov 2026): no block, no
 * "next" row, no pins and no summary line before it.
 *
 * Inputs: trip — the whole trip, or any half of it.
 * Output: true when dates/confirmed names an option that is in dates/options.
 * Examples: see stage() below; "case 42" is the undo.
 */
export function datesSettled(trip: Trip): boolean {
  const optionId = trip.dates?.confirmed?.optionId;
  return optionId !== undefined && trip.dates?.options?.[optionId] !== undefined;
}

/**
 * Picks the block that leads the page for one member, so the page asks one
 * thing at a time and moves forward as the trip settles (plan section 3).
 *
 * 1. dates   while there are date options and none is confirmed; Parties
 *            shows as a "next" row and opens.
 * 2. stay    once the dates are confirmed, while a destination that has a
 *            stay option has no confirmed stay.
 * 3. parties while the member is in for no show.
 * 4. allSet  after that.
 *
 * A trip with no date options skips the dates; Stay then stays hidden,
 * because the dates cannot be confirmed.
 *
 * Inputs: trip — the whole trip; a missing branch counts as empty, so a
 * half-written trip still has a stage (case 9).
 * memberId — this device's member, or null before the friend replies.
 * Output: the leading stage.
 * Examples (each is a test in stage.test.ts):
 *   options, none confirmed, a Bali stay option        → "dates"
 *   dates confirmed, a Bali option, no confirmed stay  → "stay"
 *   case 42: date confirm undone, every stay confirmed → "dates"
 *   dates confirmed, no stay options at all            → "parties"
 *   dates confirmed, the member is in for one show     → "allSet"
 */
export function stage(trip: Trip, memberId: MemberId | null): Stage {
  const hasDateOptions = Object.keys(trip.dates?.options ?? {}).length > 0;
  if (hasDateOptions && !datesSettled(trip)) return "dates";

  if (datesSettled(trip)) {
    const confirmed = trip.stay?.confirmed ?? {};
    const options = Object.values(trip.stay?.options ?? {});
    const waiting = options.some((option) => confirmed[option.destination] === undefined);
    if (waiting) return "stay";
  }

  const shows = trip.parties?.shows ?? {};
  const marks = trip.parties?.in ?? {};
  const isIn = memberId !== null && Object.keys(shows).some((showId) => marks[showId]?.[memberId] === true);
  return isIn ? "allSet" : "parties";
}
