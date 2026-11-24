import { write, type WriteResult } from "../../../lib/db";
import { newPlaceId } from "../../../lib/ids";
import * as paths from "../../../lib/paths";
import type { Spot } from "../../../lib/placeSearch";
import type { CustomPlace, MemberId, Show, Trip } from "../../../types/trip";
import { placeOf } from "../lib/detail";
import { showId } from "../lib/shows";

/** What a friend types in Add an event (screen 8). About and link are "" when left empty. */
export interface PartyDraft {
  destination: string;
  venue: string;
  date: string;
  artist: string;
  about: string;
  link: string;
  /** Where the venue is, when it was picked from the place search; it gets a pin. */
  spot?: Spot;
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
 * A venue picked from the place search also goes on the map, in the
 * same write (newPin).
 * Examples (checked on the emulator):
 *   a new boat party by ka   → { ok: true }; the row reads "added by KA"
 *   " savaya", Sat 13 Feb, "peggy gou" → { ok: false, reason: "listed", id: "bali_2027-02-13_savaya_peggy-gou" }
 *   Koh Phangan, picked "Bottle Beach 1 · Haad Khuat, Thailand" → the event and its pin, at once
 */
export function addShow(tripId: string, trip: Trip, draft: PartyDraft, memberId: MemberId): Promise<AddResult> {
  const id = showId(draft);
  const listed = Object.entries(trip.parties?.shows ?? {}).find(([key, show]) => key === id || showId(show) === id);
  if (listed) return Promise.resolve({ ok: false, reason: "listed", id: listed[0] });
  const show: Show = { ...fields(draft), verified: true, source: "friend", addedBy: memberId, at: Date.now() };
  return write({ [paths.show(tripId, id)]: show, ...newPin(tripId, trip, draft, memberId) });
}

/**
 * Saves an edit. The show keeps its id, its source, who added it and when,
 * because the rules refuse a change of the adder, and a weekly show stays
 * weekly (the sheet does not offer the day).
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
  const { source, verified, addedBy, at, area, weekly } = current;
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

/** The draft as stored: trimmed, with no about or link field when it is empty. */
function fields(draft: PartyDraft) {
  const about = draft.about.trim();
  const link = draft.link.trim();
  return {
    destination: draft.destination,
    venue: draft.venue.trim(),
    date: draft.date,
    artist: draft.artist.trim(),
    ...(about ? { about } : {}),
    ...(link ? { link } : {}),
  };
}

/**
 * Puts a tag on a venue, or takes it off. A new tag's name goes in the
 * same write, so a tag never exists without its name. Only an organizer's
 * write is accepted.
 *
 * Inputs: the trip id, the venue's id in places/venues, the tag's slug,
 * whether the venue carries it, and the name of a tag the trip does not
 * have yet.
 * Output: the write's result; "refused" on a friend's device.
 * Examples (checked on the emulator):
 *   setVenueTag(t, "savaya", "big", false)                  → { ok: true }; Savaya leaves Big nights
 *   setVenueTag(t, "klymax", "rooftop", true, "Rooftop")     → { ok: true }; a "Rooftop" chip appears
 */
export function setVenueTag(tripId: string, venueId: string, tag: string, on: boolean, newName?: string): Promise<WriteResult> {
  return write({
    [paths.venueTag(tripId, venueId, tag)]: on ? true : null,
    ...(newName ? { [paths.tagName(tripId, tag)]: newName } : {}),
  });
}
