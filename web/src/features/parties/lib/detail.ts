import { dayMonth, weekdayDate } from "../../../lib/format";
import { idFromName } from "../../../lib/ids";
import { placeName } from "../../../lib/place";
import type { DestinationId, Trip, Weekday } from "../../../types/trip";

/**
 * The parties context's rules for saying when and where a show is and what
 * its link is: the list's "Savaya · Uluwatu" and "Every Sunday", the show
 * sheet's "Sat 13 Feb 2027", "10 pm – 4 am" and "Savaya · Uluwatu, Bali", the place it
 * opens on the map, and whether its "Event page" opens.
 */

const DAY_NAMES: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/**
 * Names a weekly show's day as the list's tile and screen readers say it.
 * Inputs: weekly — the show's day. Output: "Every Sunday".
 * Examples (checked through whenLine's tests): every("sun") → "Every Sunday"
 */
export function every(weekly: Weekday): string {
  return `Every ${DAY_NAMES[weekly]}`;
}

/**
 * The show sheet's date line. A dated show names its day in full, with the
 * year, so nobody reads it as this year's; a weekly show names its day and
 * its first night.
 *
 * Inputs: show — its date ("YYYY-MM-DD") and, for a weekly show, its day.
 * Output: "Sat 13 Feb 2027", or "Every Sunday from 7 Feb".
 * Examples (each is a test in detail.test.ts):
 *   whenLine({ date: "2027-02-13" })                 → "Sat 13 Feb 2027"
 *   whenLine({ date: "2027-02-07", weekly: "sun" })  → "Every Sunday from 7 Feb"
 */
export function whenLine(show: { date: string; weekly?: Weekday }): string {
  return show.weekly ? `${every(show.weekly)} from ${dayMonth(show.date)}` : `${weekdayDate(show.date)} ${show.date.slice(0, 4)}`;
}

/** "HH:MM" on the 24-hour clock, as database.rules.json takes a show's startTime and endTime. */
const HHMM = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;

/**
 * Keeps the start and end of a night that the database takes, from values
 * nobody has checked yet (the events check's answer, a form, an old
 * show): each must be "HH:MM" on the 24-hour clock; an end needs a start
 * (database.rules.json refuses one alone); an end equal to the start says
 * nothing and is dropped. An end before the start is the next morning and
 * stays.
 *
 * Inputs: start, end — anything.
 * Output: {}, { startTime }, or { startTime, endTime }, ready to spread
 * into a show.
 * Examples (each is a test in detail.test.ts):
 *   showTimes("22:00", "04:00")   → { startTime: "22:00", endTime: "04:00" }
 *   showTimes(undefined, "04:00") → {}
 *   showTimes("22:00", "22:00")   → { startTime: "22:00" }
 *   showTimes("24:00", 4)         → {}
 */
export function showTimes(start: unknown, end: unknown): { startTime?: string; endTime?: string } {
  if (typeof start !== "string" || !HHMM.test(start)) return {};
  return typeof end === "string" && HHMM.test(end) && end !== start ? { startTime: start, endTime: end } : { startTime: start };
}

// "22:30" → "10:30 pm"; "22:00" → "10 pm"; "00:00" → "12 am".
function clock(time: string): string {
  const [, hours, minutes] = HHMM.exec(time) ?? [];
  const hour = Number(hours);
  const shown = hour % 12 === 0 ? 12 : hour % 12;
  return `${shown}${minutes === "00" ? "" : `:${minutes}`} ${hour < 12 ? "am" : "pm"}`;
}

/**
 * The detailed views' time line, under the date: when the night starts and
 * ends, on the venue's own clock with no time zone (owner, 25 Nov 2026:
 * "detailed event view should have start and end time when applicble").
 * The 12-hour style, minutes only when not ":00", an en dash with spaces.
 * An end that reads before the start is the next morning and reads as it
 * is ("10 pm – 4 am"). A weekly show's line reads the same.
 *
 * Inputs: show — its startTime and endTime, either absent, in any shape.
 * Output: "10 pm – 4 am", "From 10:30 pm", or null when there is no start
 * in "HH:MM" (no line and no gap).
 * Examples (each is a test in detail.test.ts):
 *   timeLine({ startTime: "22:00", endTime: "04:00" }) → "10 pm – 4 am"
 *   timeLine({ startTime: "22:30" })                   → "From 10:30 pm"
 *   timeLine({ endTime: "04:00" })                     → null
 *   timeLine({ startTime: "12:00", endTime: "00:00" }) → "12 pm – 12 am"
 */
export function timeLine(show: { startTime?: unknown; endTime?: unknown }): string | null {
  const { startTime, endTime } = showTimes(show.startTime, show.endTime);
  if (!startTime) return null;
  return endTime ? `${clock(startTime)} – ${clock(endTime)}` : `From ${clock(startTime)}`;
}

/** A place the map can open on: a venue of places/venues, or a place a friend put on the map. */
export interface MapPlace {
  kind: "venue" | "custom";
  id: string;
  /** Its own area id, for a venue that has one. */
  areaId?: string;
  /** Its one plain line ("Club on the cliffs"), for a venue that has one. */
  line?: string;
}

interface PlaceRecord {
  name?: unknown;
  destination?: unknown;
  areaId?: unknown;
  line?: unknown;
  lat?: unknown;
  lng?: unknown;
}

/**
 * Finds the place on the map where a show happens, by its venue's name in
 * its destination. The trip's venues come first; then the places friends
 * put on the map (places/custom), read with care because that branch may be
 * missing or hold a record of another shape. A place without a position is
 * no use to the map and is skipped.
 *
 * Inputs: show — its destination and venue; places — the trip's places
 * branch as the database holds it, or undefined.
 * Output: { kind, id, areaId?, line? }, or null when no place matches
 * (a friend's event at a venue the trip does not know).
 * Examples (each is a test in detail.test.ts):
 *   Savaya in Bali, places with venues.savaya          → { kind: "venue", id: "savaya", areaId: "uluwatu", line: "Club on the cliffs" }
 *   "Kai's villa" in Bali, only in places/custom/p1     → { kind: "custom", id: "p1" }
 */
export function placeOf(show: { destination: DestinationId; venue: string }, places: unknown): MapPlace | null {
  const branch = (places ?? {}) as { venues?: Record<string, PlaceRecord>; custom?: Record<string, PlaceRecord> };
  const wanted = idFromName(show.venue);
  const matches = (record: PlaceRecord) =>
    typeof record?.name === "string" &&
    record.destination === show.destination &&
    typeof record.lat === "number" &&
    typeof record.lng === "number" &&
    idFromName(record.name) === wanted;
  for (const kind of ["venues", "custom"] as const) {
    const found = Object.entries(branch[kind] ?? {}).find(([, record]) => matches(record));
    if (!found) continue;
    const [id, record] = found;
    return {
      kind: kind === "venues" ? "venue" : "custom",
      id,
      ...(typeof record.areaId === "string" ? { areaId: record.areaId } : {}),
      ...(typeof record.line === "string" ? { line: record.line } : {}),
    };
  }
  return null;
}

/**
 * Says whether a show's area is worth printing beside its venue. An area
 * that repeats the destination, or that the venue's name already holds,
 * adds nothing.
 *
 * Inputs: venue — the venue as listed; area — the show's or the venue's
 * area, if any; destination — the destination's name, with or without its country.
 * Output: the area, trimmed, or undefined when it adds nothing.
 * Examples (each is a test in detail.test.ts):
 *   areaShown("Savaya", "Uluwatu", "Bali")                  → "Uluwatu"
 *   areaShown("Lost Jungle", "Koh Phangan", "Koh Phangan")  → undefined
 *   areaShown("Lost Jungle", "Koh Phangan", "Koh Phangan, Thailand")  → undefined
 */
export function areaShown(venue: string, area: string | undefined, destination: string): string | undefined {
  const trimmed = area?.trim();
  if (!trimmed || trimmed === destination || destination.startsWith(`${trimmed}, `) || venue.toLowerCase().includes(trimmed.toLowerCase())) return undefined;
  return trimmed;
}

/**
 * The show sheet's place line: the venue, then the area and the
 * destination with its country, as the owner wrote it ("Savaya · Uluwatu,
 * Bali, Indonesia"). An area from the place search already names its
 * country ("Haad Khuat, Thailand"), so it stands alone: the event may lie
 * far from the destination it lists under.
 *
 * Inputs: as areaShown(); destination is named with its country (lib/place.ts).
 * Output: "venue · area, destination", "venue · area" for an area with its
 * country, or "venue · destination" when the area adds nothing.
 * Examples (each is a test in detail.test.ts):
 *   placeLine("Savaya", "Uluwatu", "Bali, Indonesia")                                   → "Savaya · Uluwatu, Bali, Indonesia"
 *   placeLine("Full Moon Party, Haad Rin Beach", "Haad Rin", "Koh Phangan, Thailand")   → "Full Moon Party, Haad Rin Beach · Koh Phangan, Thailand"
 *   placeLine("Bottle Beach 1", "Haad Khuat, Thailand", "Koh Phangan, Thailand")         → "Bottle Beach 1 · Haad Khuat, Thailand"
 */
export function placeLine(venue: string, area: string | undefined, destination: string): string {
  const shown = areaShown(venue, area, destination);
  if (shown?.includes(", ")) return `${venue} · ${shown}`;
  return `${venue} · ${[shown, destination].filter(Boolean).join(", ")}`;
}

/** What the sheet does with a show's link. */
export type EventLink = { kind: "page"; href: string } | { kind: "text"; text: string };

/**
 * Decides how the sheet shows a show's link. Only an https address opens
 * in a new tab as "Event page"; anything else a friend saved (an http
 * address, say) shows as plain text, so the page never opens an
 * unencrypted or odd address for them.
 *
 * Inputs: link — the show's link; absent or blank when it has none.
 * Output: { kind: "page", href } for https, { kind: "text", text } for
 * anything else, null when there is no link.
 * Examples (each is a test in detail.test.ts):
 *   eventLink("https://www.savaya.com/event-calendar/february-13-2027") → { kind: "page", href: that address }
 *   eventLink("http://example.com/party")                              → { kind: "text", text: "http://example.com/party" }
 */
export function eventLink(link: string | undefined): EventLink | null {
  const text = link?.trim();
  if (!text) return null;
  try {
    if (new URL(text).protocol === "https:") return { kind: "page", href: text };
  } catch {
    // Not an address at all: the friend still sees what was saved.
  }
  return { kind: "text", text };
}

/** Where a show is, as the show sheet and the shared event page say it. */
export interface ShowPlace {
  /** "Savaya · Uluwatu, Bali, Indonesia". */
  where: string;
  /** The venue's one plain line ("Club on the cliffs"), when the trip has one. */
  line?: string;
  /** The venue's picture (places/venues photoUrl), when it has one. */
  photoUrl?: string;
}

/**
 * Says where a show is, in one place for the show sheet and the shared
 * event page: the place line (placeLine) with the destination named with
 * its country, the area the show names or else its venue's, the venue's
 * one line, and the venue's picture. A friend's event at a venue the trip
 * does not know has its place line alone.
 *
 * Inputs: show — its destination, venue and area; trip — its info and places.
 * Output: { where, line?, photoUrl? }.
 * Examples (each is a test in detail.test.ts):
 *   Peggy Gou at Savaya, Bali, Indonesia → { where: "Savaya · Uluwatu, Bali, Indonesia", line: "Club on the cliffs", photoUrl: "https://…/savaya.jpg" }
 *   a friend's party at "Kai's villa"     → { where: "Kai's villa · Bali, Indonesia" }
 */
export function showPlace(show: { destination: DestinationId; venue: string; area?: string }, trip: Pick<Trip, "info" | "places">): ShowPlace {
  const destination = trip.info?.destinations?.[show.destination];
  const named = destination ? placeName(destination.name, destination.country) : show.destination;
  const place = placeOf(show, trip.places);
  const area = show.area ?? trip.places?.areas?.[place?.areaId ?? ""]?.name;
  const wanted = idFromName(show.venue);
  const venue = Object.values(trip.places?.venues ?? {}).find((one) => one?.destination === show.destination && typeof one.name === "string" && idFromName(one.name) === wanted);
  return {
    where: placeLine(show.venue, area, named),
    ...(place?.line ? { line: place.line } : {}),
    ...(venue?.photoUrl ? { photoUrl: venue.photoUrl } : {}),
  };
}
