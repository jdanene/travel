import type { DestinationId, Trip, Show } from "../../../types/trip";
import { idFromName } from "../../../lib/ids";
import { byPlaceVenueDate, venueKey, type DestinationGroup, type KnownVenue } from "./shows";

/**
 * The parties context's rule for event tags (owner, 24 Nov 2026: "I need to
 * be able to add or remove tags from events"; "no club tags"; "anyone
 * should be able to add or remove tags"). Tags live on events only
 * (parties/showTags); each tag's name lives at places/tagNames. The Events
 * list and the map show one tag's events, or all of them, and every
 * friend's own event wherever it is.
 */

/** The tag the seed gives each event at a venue data/places.json marks `big`. */
export const BIG = "big";

/** What the Events list shows: one tag's slug, or "all". */
export type EventsFilter = string;

/** A filter chip: a tag the trip's events carry, with its name. */
export interface TagChip {
  tag: string;
  name: string;
}

/** The trip's tags as the list reads them. */
export interface TripTags {
  /** showId → the event's tags; an event with no entry has none. */
  byShow: Record<string, Set<string>>;
  /** venueKey() of each venue data/places.json marks `big` that has no event this season; it shows under Big nights. */
  bigVenues: Set<string>;
  /** tag → display name; "big" is "Big nights" unless the trip names it; a tag with no name shows its slug. */
  names: Record<string, string>;
  /** The tags the trip has made (the keys of places/tagNames), with or without an event. */
  made: Set<string>;
}

/**
 * The trip's event tags and tag names, and the big venues with no Big
 * night this season: no event tagged Big nights and none a friend added.
 * They show under Big nights with their last-season lines, even when they
 * have ordinary weekly nights (owner, 25 Nov 2026: Zouk and CÉ LA VI were
 * missing from Big nights). Nobody can tag a venue.
 *
 * Inputs: trip — its parties and places branches; either may be missing.
 * Output: { byShow, bigVenues, names, made }.
 * Examples (each is a test in tags.test.ts):
 *   showTags { s1: { big: true } }                                 → byShow s1 → { big }; names { big: "Big nights" }
 *   Savaya `big: true` with no event, Klymax `big: true` with a Big night  → bigVenues { bali_savaya }
 *   Zouk `big: true` with only an untagged weekly night                     → bigVenues has singapore_zouk
 */
export function tripTags(trip: Pick<Trip, "parties" | "places">): TripTags {
  const byShow = Object.fromEntries(Object.entries(trip.parties?.showTags ?? {}).map(([id, tags]) => [id, new Set(Object.keys(tags ?? {}))]));
  // The events Big nights would list at a venue: tagged big, or added by a friend (eventShown).
  const withEvents = new Set(
    Object.entries(trip.parties?.shows ?? {})
      .filter(([id, show]) => show.source === "friend" || byShow[id]?.has(BIG) === true)
      .map(([, show]) => venueKey(show.destination, show.venue)),
  );
  const bigVenues = new Set(
    Object.values(trip.places?.venues ?? {})
      .filter((venue) => venue.big === true)
      .map((venue) => venueKey(venue.destination, venue.name))
      .filter((key) => !withEvents.has(key)),
  );
  const tagNames = trip.places?.tagNames ?? {};
  return { byShow, bigVenues, names: { [BIG]: "Big nights", ...tagNames }, made: new Set(Object.keys(tagNames)) };
}

/**
 * Orders tags as every list of them does: "Big nights" first, then the
 * rest by name, ignoring case.
 *
 * Inputs: names — tag → name.
 * Output: a compare function for tag slugs.
 * Examples (checked through tagChips() in tags.test.ts): rooftop, big, after-dark → big, after-dark, rooftop
 */
export const byTagName = (names: Record<string, string>) => (a: string, b: string) =>
  Number(b === BIG) - Number(a === BIG) || (names[a] ?? a).localeCompare(names[b] ?? b, "en", { sensitivity: "base" });

/**
 * The filter chips before "All" (owner, 24 Nov 2026: "we create a new tag
 * by pressing a button next to the existing tabs"): one per tag the trip
 * has made, even with no event yet, one per tag an event carries, and Big
 * nights while a big venue with no event shows under it; "Big nights"
 * first, then the rest by name.
 *
 * Inputs: tags — tripTags() of the trip.
 * Output: the chips; empty when the trip has made no tag, no event carries one and no big venue waits.
 * Examples (each is a test in tags.test.ts):
 *   tagNames { rooftop }, one event big     → Big nights, Rooftop (Rooftop with no event yet)
 *   no tag made, none on an event, no big venue → []
 */
export function tagChips(tags: TripTags): TagChip[] {
  const listed = new Set([...tags.made, ...Object.values(tags.byShow).flatMap((set) => [...set])]);
  if (tags.bigVenues.size > 0) listed.add(BIG);
  return [...listed].sort(byTagName(tags.names)).map((tag) => ({ tag, name: tags.names[tag] ?? tag }));
}

/**
 * The filter the list opens on: the device's last pick while that chip
 * exists, else "Big nights" when it is a chip, else "all".
 *
 * Inputs: stored — the device's last pick, or null; chips — tagChips().
 * Output: a chip's tag, or "all".
 * Examples (each is a test in tags.test.ts):
 *   nothing stored, Big nights a chip → "big"
 *   "rooftop" stored, no event left tagged rooftop, no Big nights → "all"
 */
export function pickFilter(stored: string | null, chips: TagChip[]): EventsFilter {
  if (stored === "all" || chips.some((chip) => chip.tag === stored)) return stored!;
  return chips.some((chip) => chip.tag === BIG) ? BIG : "all";
}

/**
 * Says whether the Events list shows an event under a filter: "all" shows
 * every event; a tag shows the events that carry it, and every event a
 * friend added, whatever its tags.
 *
 * Inputs: filter; id — the event's showId; show — its source; tags — tripTags().
 * Output: true when the list shows the event.
 * Examples (each is a test in tags.test.ts):
 *   "big", a seeded event tagged big                    → true
 *   "big", a seeded event with no tags                  → false
 *   "big", a friend's event with no tags                → true
 *   "all", any event                                    → true
 */
export function eventShown(filter: EventsFilter, id: string, show: Pick<Show, "source">, tags: TripTags): boolean {
  return filter === "all" || show.source === "friend" || tags.byShow[id]?.has(filter) === true;
}

/**
 * Says whether the list keeps a venue that has no event to show: under
 * "all" every venue; under Big nights a big venue with no Big night this
 * season, with its last-season lines. No other tag keeps a venue.
 *
 * Inputs: filter; venue — its destination and name; tags — tripTags().
 * Output: true when the list keeps the venue.
 * Examples (each is a test in tags.test.ts):
 *   "big", Savaya (big) with only last season → true
 *   "rooftop", the same Savaya                → false
 */
export function venueShown(filter: EventsFilter, venue: { destination: DestinationId; venue: string }, tags: TripTags): boolean {
  return filter === "all" || (filter === BIG && tags.bigVenues.has(venueKey(venue.destination, venue.venue)));
}

/**
 * Makes a tag's slug from the name a friend types: idFromName()'s
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
 * The Events list under a filter: byPlaceVenueDate() of the events the
 * filter keeps, with each venue that has nothing left to show taken out
 * unless venueShown() keeps it. The map does not follow it (app/lib/pins.ts).
 *
 * Inputs: shows — parties/shows; known — the venues of places/venues;
 * filter; tags — tripTags() of the trip.
 * Output: destinations, venues and events in byPlaceVenueDate()'s order;
 * a destination with no venue left is taken out.
 * Examples (each is a test in tags.test.ts):
 *   "big", Klymax and Savaya (big) with nothing announced, Mrs Sippy with an untagged event → Bali: Klymax, Savaya
 *   "big", a friend's event at Mrs Sippy beside an untagged seeded one → Bali: Mrs Sippy with the friend's event alone, then Klymax, Savaya
 */
export function eventsList(shows: Record<string, Show>, known: KnownVenue[], filter: EventsFilter, tags: TripTags): DestinationGroup[] {
  const kept = Object.fromEntries(Object.entries(shows).filter(([id, show]) => eventShown(filter, id, show, tags)));
  return byPlaceVenueDate(kept, known)
    .map(({ destination, venues }) => ({
      destination,
      venues: venues.filter((venue) => venue.shows.length > 0 || venueShown(filter, { destination, venue: venue.name }, tags)),
    }))
    .filter((group) => group.venues.length > 0);
}
