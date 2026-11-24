import { idFromName } from "../../../lib/ids";
import type { DestinationId, Show } from "../../../types/trip";

/**
 * The parties context's rules about shows: what makes two shows the same,
 * and the order the list draws them in. Kept free of runtime-only
 * TypeScript, because scripts/seed-parties.mjs runs it under Node as well.
 */

/** The fields that say which party a show is. */
export interface ShowKey {
  destination: DestinationId;
  venue: string;
  date: string;
  artist: string;
}

/**
 * Names a venue inside its destination, so " SAVAYA" and "Savaya" are one
 * venue in the list, in the last-year rule and in the venue lookup of
 * places/venues (whose ids come from the same idFromName).
 *
 * Inputs: destination — a destination id; venue — the venue as typed.
 * Output: "bali_savaya".
 * Examples (checked through showId's tests):
 *   venueKey("bali", " SAVAYA ") → "bali_savaya"
 */
export function venueKey(destination: DestinationId, venue: string): string {
  return `${destination}_${idFromName(venue)}`;
}

/**
 * The id of a show, made from what the show is: its destination, date,
 * venue and artist. The seed uses it, so a second run writes the same
 * records (case 23); Add a party uses it, so a friend who adds a party
 * that is already listed finds that row instead of a copy (case 28).
 *
 * Inputs: show — destination id, venue, date as "YYYY-MM-DD", artist.
 * Output: an id that fits a database path and the rules' 200 characters.
 * Case, accents, spaces and punctuation do not count. Only the first 40
 * characters of the venue and of the artist count, so two long notes
 * that differ only after that are one show.
 * Examples (each is a test in shows.test.ts):
 *   { bali, "Savaya", 2027-02-13, "Peggy Gou" }      → "bali_2027-02-13_savaya_peggy-gou"
 *   { bali, " SAVAYA ", 2027-02-13, "peggy   gou" } → the same id
 */
export function showId(show: ShowKey): string {
  return `${show.destination}_${show.date}_${idFromName(show.venue)}_${idFromName(show.artist)}`;
}

/** One show with its id, as the list draws it. */
export type ListedShow = Show & { id: string };

export interface VenueGroup {
  /** venueKey() of the venue. */
  key: string;
  /** The venue as places/venues spells it, or else as its earliest show does. */
  name: string;
  /** The venue's own area from places/venues, or else the first area any of its shows names. */
  area?: string;
  /** Weekly shows first, then the dated ones by date. Empty for a venue with nothing announced. */
  shows: ListedShow[];
}

export interface DestinationGroup {
  destination: DestinationId;
  venues: VenueGroup[];
}

/** A venue the trip knows from places/venues (or a friend's place), listed even with no show. */
export interface KnownVenue {
  name: string;
  destination: DestinationId;
  area?: string;
}

/**
 * Orders the list as the Events module draws it: by destination, then
 * venue, then date. Every known venue shows, so a friend sees each club
 * even before it announces anything. Venues with a show this year come
 * first, by their first night (a weekly show counts from its first night),
 * then the rest by name. Venue spellings that differ only by case or spaces
 * fall into one group.
 *
 * Inputs: shows — parties/shows as the database holds it; may be empty.
 * known — the venues of places/venues; may be empty.
 * Output: destinations by id (the database keeps them in that order too).
 * Inside a venue, weekly shows come first, then dated shows by date, then
 * artist. A known venue without shows has an empty list. Nothing at all,
 * no groups.
 * Examples (checked on the emulator with the seed):
 *   the 2027 file and data/places.json → Bali: Mrs Sippy, Ulu Cliffhouse
 *     (every Saturday from 6 Feb), El Kabron, Single Fin (every Sunday from
 *     7 Feb), Savaya (13 Feb to 13 Mar), then Atlas Beach Club to Potato Head
 *     by name, each with nothing announced
 */
export function byPlaceVenueDate(shows: Record<string, Show>, known: KnownVenue[] = []): DestinationGroup[] {
  const listed = Object.entries(shows)
    .map(([id, show]) => ({ ...show, id }))
    .sort((a, b) => Number(!a.weekly) - Number(!b.weekly) || a.date.localeCompare(b.date) || a.artist.localeCompare(b.artist));

  const venues = new Map<string, VenueGroup & { destination: DestinationId; first?: string }>();
  for (const venue of known) {
    const key = venueKey(venue.destination, venue.name);
    venues.set(key, { key, destination: venue.destination, name: venue.name.trim(), area: venue.area, shows: [] });
  }
  for (const show of listed) {
    const key = venueKey(show.destination, show.venue);
    const group = venues.get(key) ?? { key, destination: show.destination, name: show.venue.trim(), shows: [] };
    group.area ??= show.area?.trim() || undefined;
    group.first = group.first === undefined || show.date < group.first ? show.date : group.first;
    group.shows.push(show);
    venues.set(key, group);
  }

  const order = (a: { name: string; first?: string }, b: { name: string; first?: string }) =>
    Number(a.first === undefined) - Number(b.first === undefined) ||
    (a.first ?? "").localeCompare(b.first ?? "") ||
    a.name.localeCompare(b.name, "en", { sensitivity: "base" });

  const destinations = new Map<DestinationId, VenueGroup[]>();
  for (const { destination, first: _first, ...group } of [...venues.values()].sort(order)) {
    destinations.set(destination, [...(destinations.get(destination) ?? []), group]);
  }
  return [...destinations.keys()].sort().map((destination) => ({ destination, venues: destinations.get(destination)! }));
}

