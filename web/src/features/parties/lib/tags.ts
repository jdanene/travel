import type { DestinationId, Places, Show } from "../../../types/trip";
import { idFromName } from "../../../lib/ids";
import { byPlaceVenueDate, venueKey, type DestinationGroup, type KnownVenue } from "./shows";

/**
 * The parties context's rule for venue tags (owner, 24 Nov 2026: "I should
 * also be able to remove the tag 'big nights' or add arbitrary tags"). An
 * organizer tags the trip's venues (places/tags) and names each tag
 * (places/tagNames); the Events list and the map show one tag's venues, or
 * all of them, and every friend's own event wherever it is.
 */

/** The tag create-trip seeds from data/places.json's `big`. */
export const BIG = "big";

/** What the Events list shows: one tag's slug, or "all". */
export type EventsFilter = string;

/** A filter chip: a tag the trip's venues carry, with its name. */
export interface TagChip {
  tag: string;
  name: string;
}

/** The trip's tags as the list reads them. */
export interface TripTags {
  /** venueKey() → the venue's tags, so a show finds its venue whatever case or spacing it was typed in. */
  byVenue: Map<string, Set<string>>;
  /** tag → display name; a tag with no name shows its slug. */
  names: Record<string, string>;
}

/**
 * The trip's venue tags, keyed by venueKey(). A trip written before tags
 * (no places/tags and no places/tagNames) reads its venues' `big` flags as
 * the "Big nights" tag, so the page works before create-trip seeds them.
 *
 * Inputs: places — the trip's places branch; may be missing.
 * Output: { byVenue, names }.
 * Examples (each is a test in tags.test.ts):
 *   tags { savaya: { big: true } }, tagNames { big: "Big nights" } → byVenue bali_savaya → { big }
 *   no tags or tagNames, Savaya `big: true`                         → bali_savaya → { big }, names { big: "Big nights" }
 */
export function tripTags(places: Places | undefined): TripTags {
  const venues = places?.venues ?? {};
  const legacy = places?.tags === undefined && places?.tagNames === undefined;
  const byVenue = new Map<string, Set<string>>();
  for (const [venueId, venue] of Object.entries(venues)) {
    const tags = legacy ? (venue.big ? [BIG] : []) : Object.keys(places?.tags?.[venueId] ?? {});
    if (tags.length) byVenue.set(venueKey(venue.destination, venue.name), new Set(tags));
  }
  const names = legacy ? { [BIG]: "Big nights" } : { ...(places?.tagNames ?? {}) };
  return { byVenue, names };
}

/**
 * The filter chips before "All": one per tag that any venue carries,
 * "Big nights" first, then the rest by name.
 *
 * Inputs: tags — tripTags() of the trip.
 * Output: the chips; empty when no venue carries a tag.
 * Examples (each is a test in tags.test.ts):
 *   Savaya big and "rooftop", Klymax big → Big nights, Rooftop
 *   no venue tagged                     → []
 */
export function tagChips(tags: TripTags): TagChip[] {
  const used = new Set([...tags.byVenue.values()].flatMap((set) => [...set]));
  return [...used]
    .map((tag) => ({ tag, name: tags.names[tag] ?? tag }))
    .sort((a, b) => Number(b.tag === BIG) - Number(a.tag === BIG) || a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

/**
 * The filter the list opens on: the device's last pick while that chip
 * exists, else "Big nights" when some venue carries it, else "all".
 *
 * Inputs: stored — the device's last pick, or null; chips — tagChips().
 * Output: a chip's tag, or "all".
 * Examples (each is a test in tags.test.ts):
 *   nothing stored, Big nights a chip → "big"
 *   "rooftop" stored, no venue left tagged rooftop, no Big nights → "all"
 */
export function pickFilter(stored: string | null, chips: TagChip[]): EventsFilter {
  if (stored === "all" || chips.some((chip) => chip.tag === stored)) return stored!;
  return chips.some((chip) => chip.tag === BIG) ? BIG : "all";
}

/**
 * Says whether the Events list (or the map) shows an entry under a
 * filter. An entry is a show, a venue, or a last-year line: each names a
 * destination and a venue, and a show also has its source. "all" shows
 * everything; a tag shows what is at a venue carrying it, and every event
 * a friend added, wherever it is. A friend's event has no tags of its
 * own: it is at its venue, with that venue's tags.
 *
 * Inputs: filter; entry — destination and venue, and a show's source;
 * tags — tripTags() of the trip.
 * Output: true when the list shows the entry.
 * Examples (each is a test in tags.test.ts):
 *   "big", a seeded show at Savaya (tagged big)          → true
 *   "rooftop", a seeded show at Savaya (big only)        → false
 *   "all", a seeded show at Mrs Sippy (untagged)         → true
 *   "big", a friend's event at Mrs Sippy (untagged)      → true
 */
export function shownUnder(
  filter: EventsFilter,
  entry: { destination: DestinationId; venue: string; source?: Show["source"] },
  tags: TripTags,
): boolean {
  return filter === "all" || entry.source === "friend" || tags.byVenue.get(venueKey(entry.destination, entry.venue))?.has(filter) === true;
}

/**
 * Makes a tag's slug from the name an organizer types: idFromName()'s
 * letters, digits and hyphens, cut to 24 characters, the rules' limit.
 *
 * Inputs: name — the tag's name as typed.
 * Output: the slug, at most 24 characters, never ending in a hyphen.
 * Examples (each is a test in tags.test.ts):
 *   " Rooftop "                                   → "rooftop"
 *   "The very best sunset rooftops of Bali"       → "the-very-best-sunset-roo"
 */
export function tagSlug(name: string): string {
  return idFromName(name).slice(0, 24).replace(/-+$/, "");
}

/**
 * The Events list under a filter: byPlaceVenueDate() of the shows the
 * filter keeps, with each venue that has nothing left to show taken out.
 * A venue the filter keeps stays even with no show, so a tagged club still
 * says "Nothing announced yet." and who played there last season. A venue
 * that stays only for a friend's event keeps that event alone.
 *
 * Inputs: shows — parties/shows; known — the venues of places/venues;
 * filter; tags — tripTags() of the trip.
 * Output: destinations, venues and shows in byPlaceVenueDate()'s order;
 * a destination with no venue left is taken out.
 * Examples (each is a test in tags.test.ts):
 *   "big", Savaya (big) with nothing announced, Mrs Sippy (untagged) with a seeded show → Bali: Savaya alone
 *   "big", a friend's event at Mrs Sippy beside its seeded show → Bali: Mrs Sippy with the friend's event alone, then Savaya
 */
export function eventsList(shows: Record<string, Show>, known: KnownVenue[], filter: EventsFilter, tags: TripTags): DestinationGroup[] {
  const kept = Object.fromEntries(Object.entries(shows).filter(([, show]) => shownUnder(filter, show, tags)));
  return byPlaceVenueDate(kept, known)
    .map(({ destination, venues }) => ({
      destination,
      venues: venues.filter((venue) => venue.shows.length > 0 || shownUnder(filter, { destination, venue: venue.name }, tags)),
    }))
    .filter((group) => group.venues.length > 0);
}
