import { write, type WriteResult } from "../../../lib/db";
import * as paths from "../../../lib/paths";
import type { MemberId, Show, Trip } from "../../../types/trip";
import { showId } from "../lib/shows";

/** What a friend types in Add a party (screen 8). Link is "" when left empty. */
export interface PartyDraft {
  destination: string;
  venue: string;
  date: string;
  artist: string;
  link: string;
}

/**
 * Marks a member in for a show, or takes the mark back. The listener shows
 * the change at once; with no connection the write waits and sends later,
 * and a refusal flips the mark back (Trip 11, case 9).
 *
 * Inputs: the trip, the show, the member, and whether they are in.
 * Output: the write's result; a refusal names no field.
 * Examples (checked on the emulator): setIn(t, show, "rb", true) by rb's device → { ok: true }
 */
export function setIn(tripId: string, id: string, memberId: MemberId, isIn: boolean): Promise<WriteResult> {
  return write({ [paths.inMark(tripId, id, memberId)]: isIn ? true : null });
}

export type AddResult = WriteResult | { ok: false; reason: "listed"; id: string };

/**
 * Adds a friend's party under its content id. When a show with the same
 * venue, date and artist is already listed (ignoring case and spaces), it
 * adds nothing and returns that show's id, so the list can bring the row
 * into view (case 28).
 *
 * Inputs: the trip id, the trip as the page holds it, the draft (already
 * checked by the sheet), and the member who adds it.
 * Output: the write's result, or { ok: false, reason: "listed", id }.
 * A friend is the source of their own party, so it is stored as verified
 * and the row says who added it instead of "not confirmed".
 * Examples (checked on the emulator):
 *   a new boat party by ka   → { ok: true }; the row reads "added by KA"
 *   " savaya", Sat 13 Feb, "peggy gou" → { ok: false, reason: "listed", id: "bali_2027-02-13_savaya_peggy-gou" }
 */
export function addShow(tripId: string, trip: Trip, draft: PartyDraft, memberId: MemberId): Promise<AddResult> {
  const id = showId(draft);
  const listed = Object.entries(trip.parties?.shows ?? {}).find(([key, show]) => key === id || showId(show) === id);
  if (listed) return Promise.resolve({ ok: false, reason: "listed", id: listed[0] });
  const show: Show = { ...fields(draft), verified: true, source: "friend", addedBy: memberId, at: Date.now() };
  return write({ [paths.show(tripId, id)]: show });
}

/**
 * Saves an edit. The show keeps its id, its source, who added it and when,
 * because the rules refuse a change of the adder.
 *
 * Inputs: the trip id, the show's id, the show as it is, and the draft.
 * Output: the write's result; "refused" when this device neither added the
 * show nor holds the organizer mark.
 * Examples (checked on the emulator): ka edits her own party → { ok: true }
 */
export function editShow(tripId: string, id: string, current: Show, draft: PartyDraft): Promise<WriteResult> {
  const { source, verified, addedBy, at, area } = current;
  const show: Show = { ...fields(draft), source, verified, at, ...(addedBy ? { addedBy } : {}), ...(area ? { area } : {}) };
  return write({ [paths.show(tripId, id)]: show });
}

/**
 * Removes a show and its "in" marks in one write, so no mark is left
 * pointing at nothing (case 29).
 *
 * Inputs: the trip id and the show's id.
 * Output: the write's result; "refused" as for editShow().
 * Examples (checked on the emulator): ka removes her party → { ok: true }; its marks go with it
 */
export function removeShow(tripId: string, id: string): Promise<WriteResult> {
  return write({ [paths.show(tripId, id)]: null, [paths.showIn(tripId, id)]: null });
}

/** The draft as stored: trimmed, with no link field when the link is empty. */
function fields(draft: PartyDraft) {
  const link = draft.link.trim();
  return {
    destination: draft.destination,
    venue: draft.venue.trim(),
    date: draft.date,
    artist: draft.artist.trim(),
    ...(link ? { link } : {}),
  };
}
