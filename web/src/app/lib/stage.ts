import type { Trip } from "../../types/trip";

/**
 * Where the trip stands. It decides only whether Stay shows, what is
 * pinned and whether the summary shows; Dates, Stay and Parties are equal
 * open sections, and none of them leads (owner, 23 Nov 2026).
 */
export type Stage = "dates" | "plan" | "allSet";

/**
 * Says whether the dates are settled: a confirmed date option that still
 * exists. Stay shows only after this.
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
 * Says where the trip stands, so the page knows which sections to show
 * and which to pin (plan section 3).
 *
 * 1. dates   while no date option is confirmed. Dates and Parties show;
 *            Stay shows nowhere.
 * 2. plan    once the dates are confirmed, until every destination that has
 *            a stay option has a confirmed stay. Dates is pinned; Stay and
 *            Parties show.
 * 3. allSet  after that. The summary shows; each confirmed stay is pinned;
 *            Parties stays open.
 *
 * Parties never decides the stage: a friend can be in for no show and still
 * be all set.
 *
 * Inputs: trip — the whole trip; a missing branch counts as empty, so a
 * half-written trip still has a stage (case 9).
 * Output: the stage.
 * Examples (each is a test in stage.test.ts):
 *   options, none confirmed, a Bali stay option         → "dates"
 *   dates confirmed, a Bali option, no confirmed stay   → "plan"
 *   dates confirmed, the Bali stay confirmed            → "allSet"
 *   case 42: date confirm undone, every stay confirmed  → "dates"
 *   dates confirmed, nobody has added a place yet       → "plan", so friends can still add one
 */
export function stage(trip: Trip): Stage {
  if (!datesSettled(trip)) return "dates";

  const confirmed = trip.stay?.confirmed ?? {};
  const options = Object.values(trip.stay?.options ?? {});
  const waiting = options.some((option) => confirmed[option.destination] === undefined);
  return options.length === 0 || waiting ? "plan" : "allSet";
}
