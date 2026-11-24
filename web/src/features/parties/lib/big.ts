import type { DestinationId, Show, Venue } from "../../../types/trip";
import { byPlaceVenueDate, venueKey, type DestinationGroup, type KnownVenue } from "./shows";

/**
 * The parties context's rule for big nights (owner, 24 Nov 2026: "I only
 * care about the big ones ... This is for cognitive load"). A venue of
 * data/places.json tagged big is one of the owner's own places; the Events
 * list shows those and friends' own events unless a friend picks "All".
 */

/** What the Events list shows: "big", the big venues and every friend's event; "all", everything. */
export type EventsFilter = "big" | "all";

/**
 * The big venues of the trip, as venueKey()s, so a show finds its venue
 * whatever case or spacing it was typed in.
 *
 * Inputs: venues — places/venues; may be missing.
 * Output: the venueKey() of each venue tagged big; empty when none is.
 * Examples (checked through shownUnder's tests):
 *   Savaya tagged big, Mrs Sippy not  → { "bali_savaya" }
 */
export function bigVenues(venues: Record<string, Venue> | undefined): Set<string> {
  return new Set(
    Object.values(venues ?? {})
      .filter((venue) => venue.big === true)
      .map((venue) => venueKey(venue.destination, venue.name)),
  );
}

/**
 * Says whether the Events list shows an entry under a filter. An entry is
 * a show, a venue, or a last-year line: each names a destination and a
 * venue, and a show also has its source. "all" shows everything. "big"
 * shows what is at a big venue, and every event a friend added, wherever
 * it is. A trip with no big venue at all shows everything under "big" too:
 * its venues were written before the tag, and an empty list would hide
 * every club.
 *
 * Inputs: filter; entry — destination and venue, and a show's source;
 * big — bigVenues() of the trip.
 * Output: true when the list shows the entry.
 * Examples (each is a test in big.test.ts):
 *   "big", a seeded show at Savaya (big)                  → true
 *   "big", a seeded show at Mrs Sippy (not big)           → false
 *   "big", a friend's event at Mrs Sippy                  → true
 *   "all", a seeded show at Mrs Sippy                     → true
 *   "big", a seeded show at Mrs Sippy, no big venue at all → true
 */
export function shownUnder(
  filter: EventsFilter,
  entry: { destination: DestinationId; venue: string; source?: Show["source"] },
  big: ReadonlySet<string>,
): boolean {
  return filter === "all" || big.size === 0 || entry.source === "friend" || big.has(venueKey(entry.destination, entry.venue));
}

/**
 * The Events list under a filter: byPlaceVenueDate() of the shows the
 * filter keeps, with each venue that has nothing left to show taken out,
 * its last-season lines with it. A venue the filter keeps stays even with
 * no show, so a big club still says "Nothing announced yet." and who played
 * there last season. A venue that stays only for a friend's event keeps
 * that event alone.
 *
 * Inputs: shows — parties/shows; known — the venues of places/venues;
 * filter; big — bigVenues() of the trip.
 * Output: destinations, venues and shows in byPlaceVenueDate()'s order;
 * a destination with no venue left is taken out.
 * Examples (each is a test in big.test.ts):
 *   "big", Savaya (big) with nothing announced, Mrs Sippy and Ulu Cliffhouse (not big) with seeded shows
 *     → Bali: Savaya alone
 *   "big", a friend's event at Mrs Sippy beside its seeded show
 *     → Bali: Mrs Sippy with the friend's event alone, then Savaya
 */
export function eventsList(shows: Record<string, Show>, known: KnownVenue[], filter: EventsFilter, big: ReadonlySet<string>): DestinationGroup[] {
  const kept = Object.fromEntries(Object.entries(shows).filter(([, show]) => shownUnder(filter, show, big)));
  return byPlaceVenueDate(kept, known)
    .map(({ destination, venues }) => ({
      destination,
      venues: venues.filter((venue) => venue.shows.length > 0 || shownUnder(filter, { destination, venue: venue.name }, big)),
    }))
    .filter((group) => group.venues.length > 0);
}
