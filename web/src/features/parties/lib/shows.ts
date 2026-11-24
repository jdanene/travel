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
  /** The venue as its earliest show spells it. */
  name: string;
  /** The first area any of its shows names, if one does. */
  area?: string;
  shows: ListedShow[];
}

export interface DestinationGroup {
  destination: DestinationId;
  venues: VenueGroup[];
}

/**
 * Orders the shows as screen 7 lists them: by destination, then venue,
 * then date. Venue spellings that differ only by case or spaces fall into
 * one group.
 *
 * Inputs: shows — parties/shows as the database holds it; may be empty.
 * Output: destinations by id (the database keeps them in that order too),
 * venues by name ignoring case, shows by date then artist. No shows, no groups.
 * Examples (checked on the emulator with the seed):
 *   the 2027 file → Bali: Savaya (6 shows); Koh Phangan: Haad Rin Beach,
 *                   Half Moon Festival, Hidden Paradise, Lost Jungle
 */
export function byPlaceVenueDate(shows: Record<string, Show>): DestinationGroup[] {
  const listed = Object.entries(shows)
    .map(([id, show]) => ({ ...show, id }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.artist.localeCompare(b.artist));

  const venues = new Map<string, VenueGroup & { destination: DestinationId }>();
  for (const show of listed) {
    const key = venueKey(show.destination, show.venue);
    const group = venues.get(key) ?? { key, destination: show.destination, name: show.venue.trim(), shows: [] };
    group.area ??= show.area?.trim() || undefined;
    group.shows.push(show);
    venues.set(key, group);
  }

  const destinations = new Map<DestinationId, VenueGroup[]>();
  const byName = [...venues.values()].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  for (const { destination, ...group } of byName) {
    destinations.set(destination, [...(destinations.get(destination) ?? []), group]);
  }
  return [...destinations.keys()].sort().map((destination) => ({ destination, venues: destinations.get(destination)! }));
}
