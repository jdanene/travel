import { activityLine, forgetLines } from "../../../lib/activity";
import { write, type WriteResult } from "../../../lib/db";
import { newPlaceId } from "../../../lib/ids";
import * as paths from "../../../lib/paths";
import type { Spot } from "../../../lib/placeSearch";
import type { CustomPlace, MemberId, Show, Trip } from "../../../types/trip";
import { placeOf, showTimes } from "../lib/detail";
import { showId } from "../lib/shows";

/** What a friend types in Add an event (screen 8). About, link and the times are "" when left empty. */
export interface PartyDraft {
  destination: string;
  venue: string;
  date: string;
  artist: string;
  about: string;
  link: string;
  /** "HH:MM" from the native time field, or "". */
  startTime: string;
  endTime: string;
  /** Where the venue is, when it was picked from the place search; it gets a pin. */
  spot?: Spot;
  /** The picked place's area and country from the search ("Haad Khuat, Thailand"); "" drops the show's area, absent keeps it. */
  area?: string;
}

/**
 * Marks a member in for a show, or takes the mark back. The listener shows
 * the change at once; with no connection the write waits and sends later,
 * and a refusal flips the mark back (Trip 11, case 9). Going in writes an
 * Activity line in the same write; taking the mark back removes the
 * member's "is in for" line of that show (owner, 24 Nov 2026).
 *
 * Inputs: the trip, the show's id and the show (for the line's words), the member, and whether they are in.
 * Output: the write's result; a refusal names no field.
 * Examples (checked on the emulator):
 *   setIn(t, id, peggyGou, "rb", true) by rb's device  → { ok: true }; "RB is in for Peggy Gou at Savaya"
 *   setIn(t, id, peggyGou, "rb", false)                → { ok: true }; RB's "is in for" line goes
 */
export async function setIn(tripId: string, id: string, show: Show | undefined, memberId: MemberId, isIn: boolean): Promise<WriteResult> {
  const line = isIn && show ? activityLine(tripId, { kind: "event-in", by: memberId, text: showLine(show), ref: id }) : {};
  const result = await write({ [paths.inMark(tripId, id, memberId)]: isIn ? true : null, ...line });
  if (result.ok && !isIn) void forgetLines(tripId, id, ["event-in"], memberId);
  return result;
}

/** The words an Activity line uses for a show: "Peggy Gou at Savaya". */
export function showLine(show: Pick<Show, "artist" | "venue">): string {
  return `${show.artist} at ${show.venue}`.slice(0, 500);
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
 * A venue picked from the place search also goes on the map, in the
 * same write (newPin).
 * Its Activity line goes in the same write.
 * Examples (checked on the emulator):
 *   a new boat party by ka   → { ok: true }; the row reads "added by KA"; "KA added an event: Boat party at Bottle Beach"
 *   " savaya", Sat 13 Feb, "peggy gou" → { ok: false, reason: "listed", id: "bali_2027-02-13_savaya_peggy-gou" }
 *   Koh Phangan, picked "Bottle Beach 1 · Haad Khuat, Thailand" → the event and its pin, at once
 */
export function addShow(tripId: string, trip: Trip, draft: PartyDraft, memberId: MemberId): Promise<AddResult> {
  const id = showId(draft);
  const listed = Object.entries(trip.parties?.shows ?? {}).find(([key, show]) => key === id || showId(show) === id);
  if (listed) return Promise.resolve({ ok: false, reason: "listed", id: listed[0] });
  const show: Show = { ...fields(draft), verified: true, source: "friend", addedBy: memberId, at: Date.now() };
  const line = activityLine(tripId, { kind: "event-added", by: memberId, text: showLine(show), ref: id });
  return write({ [paths.show(tripId, id)]: show, ...newPin(tripId, trip, draft, memberId), ...line });
}

/**
 * Saves an edit. The show keeps its id, its source, who added it and when,
 * because the rules refuse a change of the adder, and a weekly show stays
 * weekly (the sheet does not offer the day). The draft's times replace the
 * show's: a time the friend cleared goes (the sheet opens with the show's own).
 *
 * A venue picked from the place search goes on the map in the same write,
 * as in addShow().
 *
 * Inputs: the trip id and the trip, the show's id, the show as it is, the
 * draft, and the member who edits it.
 * Output: the write's result; "refused" when this device neither added the
 * show nor holds the organizer mark.
 * Examples (checked on the emulator): ka edits her own party → { ok: true }
 */
export function editShow(tripId: string, trip: Trip, id: string, current: Show, draft: PartyDraft, memberId: MemberId): Promise<WriteResult> {
  const { source, verified, addedBy, at, weekly } = current;
  // A new pick says the area ("" for none); with no new pick the show keeps its own.
  const area = draft.area === undefined ? current.area : undefined;
  const show: Show = { ...fields(draft), source, verified, at, ...(addedBy ? { addedBy } : {}), ...(area ? { area } : {}), ...(weekly ? { weekly } : {}) };
  return write({ [paths.show(tripId, id)]: show, ...newPin(tripId, trip, draft, memberId) });
}

/**
 * The pin for a venue picked from the place search, as Add to map makes
 * it: its name, the kind Event, the destination, where it is, and who
 * added it. The event finds it by name (placeOf in lib/detail.ts). A
 * venue the trip already has on the map, by name in the destination, gets
 * no second pin.
 *
 * Inputs: the trip id and the trip, the draft, and the member.
 * Output: { path: place } to add to the event's write, or {} when the
 * venue was typed, not picked, or is already on the map.
 * Examples (checked on the emulator):
 *   picked "Bottle Beach 1" in Koh Phangan, not on the map → one new place, kind "event"
 *   picked "Single Fin" in Bali, already a friend's place  → {}
 */
function newPin(tripId: string, trip: Trip, draft: PartyDraft, memberId: MemberId): Record<string, CustomPlace> {
  if (!draft.spot) return {};
  const venue = draft.venue.trim();
  if (placeOf({ destination: draft.destination, venue }, trip.places)) return {};
  const place: CustomPlace = { name: venue, kind: "event", destination: draft.destination, lat: draft.spot.lat, lng: draft.spot.lng, addedBy: memberId, at: Date.now() };
  return { [paths.customPlace(tripId, newPlaceId())]: place };
}

/**
 * Removes a show, its "in" marks and its tags in one write, so no mark is left
 * pointing at nothing (case 29).
 *
 * Inputs: the trip id and the show's id.
 * Output: the write's result; "refused" as for editShow().
 * Examples (checked on the emulator): ka removes her party → { ok: true }; its marks go with it
 */
export async function removeShow(tripId: string, id: string): Promise<WriteResult> {
  const result = await write({ [paths.show(tripId, id)]: null, [paths.showIn(tripId, id)]: null, [paths.showTags(tripId, id)]: null });
  if (result.ok) void forgetLines(tripId, id, ["event-added", "event-in"]);
  return result;
}

/** The draft as stored: trimmed, with no about, link, area or time field when it is empty; an end needs a start (showTimes). */
function fields(draft: PartyDraft) {
  const about = draft.about.trim();
  const link = draft.link.trim();
  const area = draft.area?.trim();
  return {
    destination: draft.destination,
    venue: draft.venue.trim(),
    ...(area ? { area } : {}),
    date: draft.date,
    artist: draft.artist.trim(),
    ...(about ? { about } : {}),
    ...(link ? { link } : {}),
    ...showTimes(draft.startTime, draft.endTime),
  };
}

/**
 * Puts a tag the trip has on an event, or takes it off. Any member's write
 * is accepted; a device that has not joined is refused.
 *
 * Inputs: the trip id, the event's showId, the tag's slug, and whether the event carries it.
 * Output: the write's result.
 * Examples (checked on the emulator):
 *   setShowTag(t, peggyGou, "big", false)    → { ok: true }; Peggy Gou leaves Big nights
 *   setShowTag(t, peggyGou, "rooftop", true) → { ok: true }; its row shows a grey "Rooftop"
 */
export function setShowTag(tripId: string, showId: string, tag: string, on: boolean): Promise<WriteResult> {
  return write({ [paths.showTag(tripId, showId, tag)]: on ? true : null });
}

/**
 * Makes a new tag: its name at places/tagNames. It shows as a filter chip
 * for everyone at once, with no event yet. Any member may; a name never
 * changes, so a tag the trip has is refused.
 *
 * Inputs: the trip id, the tag's slug (tagSlug()), and its name (1 to 24 characters).
 * Output: the write's result; "refused" on a device that has not joined.
 * Examples (checked on the emulator): makeTag(t, "rooftop", "Rooftop") → { ok: true }; a "Rooftop" chip appears
 */
export function makeTag(tripId: string, tag: string, name: string): Promise<WriteResult> {
  return write({ [paths.tagName(tripId, tag)]: name });
}
