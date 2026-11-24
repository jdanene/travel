import { dayRange } from "../../lib/format";
import type { MemberId, Trip } from "../../types/trip";

export type ModuleId = "dates" | "stay" | "parties" | "links" | "map";

export interface Module {
  id: ModuleId;
  /** The state on the right of the closed button: one line, or one per confirmed stay. */
  lines: string[];
}

/** "1 option", "7 options". */
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Says whether the dates are settled: a confirmed date option that still
 * exists. The Stay button exists only after this (owner, 23 Nov 2026).
 *
 * Inputs: trip — the whole trip, or any half of it.
 * Output: true when dates/confirmed names an option that is in dates/options.
 * Examples: see modules() below.
 */
export function datesSettled(trip: Trip): boolean {
  const optionId = trip.dates?.confirmed?.optionId;
  return optionId !== undefined && trip.dates?.options?.[optionId] !== undefined;
}

/**
 * Says whether the trip is all set: the dates are confirmed, at least one
 * place was added, and every destination that has a place has a confirmed
 * stay. The home page then shows "All set" under the title; nothing else
 * changes. Parties never count: a friend in for no show is still all set.
 *
 * Inputs: trip — the whole trip.
 * Output: true or false.
 * Examples: see modules() below; with no place added yet → false, so Stay
 * still asks for one.
 */
export function allSet(trip: Trip): boolean {
  if (!datesSettled(trip)) return false;
  const options = Object.values(trip.stay?.options ?? {});
  const confirmed = trip.stay?.confirmed ?? {};
  return options.length > 0 && options.every((option) => confirmed[option.destination] !== undefined);
}

/**
 * The module buttons of the home page, in their fixed order (Dates, Stay,
 * Parties, Links, Map), each with the state line on its right (plan
 * section 3). The order means nothing; the only rule is that Stay exists
 * once the dates are confirmed, and goes again if the confirm is undone,
 * with its data kept (case 42).
 *
 * Inputs: trip — the whole trip; a missing branch counts as empty (case 9).
 * memberId — this device's member, or null before a reply.
 * Output: the modules to show. A settled module's line is its result:
 * "13–23 Feb · confirmed", "Cliffside villa · confirmed" (one line per
 * destination with a confirmed stay).
 * Examples (each is a test in modules.test.ts):
 *   dates open                → Dates "Tap to answer", Parties, Links, Map; no Stay
 *   dates confirmed           → Dates "13–23 Feb · confirmed", Stay "1 option · heart one", …
 *   everything confirmed      → Stay "Cliffside villa · confirmed", and allSet() is true
 */
export function modules(trip: Trip, memberId: MemberId | null): Module[] {
  const shown: Module[] = [{ id: "dates", lines: [datesLine(trip, memberId)] }];
  if (datesSettled(trip)) shown.push({ id: "stay", lines: stayLines(trip) });
  const shows = Object.keys(trip.parties?.shows ?? {}).length;
  shown.push({ id: "parties", lines: [shows ? `${count(shows, "show")} · I'm in` : "Nothing announced yet."] });
  const links = Object.keys(trip.links?.items ?? {}).length;
  shown.push({ id: "links", lines: [links ? count(links, "link") : "TikToks & Instas"] });
  shown.push({ id: "map", lines: [] });
  return shown;
}

function datesLine(trip: Trip, memberId: MemberId | null): string {
  const options = trip.dates?.options ?? {};
  if (datesSettled(trip)) {
    const chosen = options[trip.dates!.confirmed!.optionId];
    return `${dayRange(chosen.from, chosen.to)} · confirmed`;
  }
  const ids = Object.keys(options);
  if (ids.length === 0) return "No dates to vote on yet.";
  const answers = trip.dates?.answers ?? {};
  const answeredAll = memberId !== null && ids.every((id) => answers[id]?.[memberId] !== undefined);
  return answeredAll ? "Answered" : "Tap to answer";
}

function stayLines(trip: Trip): string[] {
  const options = trip.stay?.options ?? {};
  const confirmed = trip.stay?.confirmed ?? {};
  const lines = Object.values(confirmed)
    .map((choice) => options[choice.stayId]?.name)
    .filter((name): name is string => name !== undefined)
    .map((name) => `${name} · confirmed`);
  const waiting = Object.values(options).filter((option) => confirmed[option.destination] === undefined).length;
  if (waiting > 0) lines.push(`${count(waiting, "option")} · heart one`);
  return lines.length ? lines : ["No places yet."];
}
