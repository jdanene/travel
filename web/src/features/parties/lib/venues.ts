import { idFromName } from "../../../lib/ids";
import { matchRank, type PlaceHit } from "../../../lib/placeSearch";

/** A venue the trip knows, in any destination: a club from places/venues, a venue friends' events name, or a friend's place on the map. */
export interface VenueSpot {
  name: string;
  destination: string;
  /** true for a club the trip lists (places/venues); clubs come first. */
  club: boolean;
  photoUrl?: string;
}

/** One line in the search under Add an event: a venue the trip knows, a place from the search, or the typed words as a new venue. */
export type VenueSuggestion = { kind: "known"; venue: VenueSpot } | { kind: "place"; hit: PlaceHit } | { kind: "new"; name: string };

/**
 * The suggestions of Add an event's search, which works like a web search
 * box (owner, 24 Nov 2026: "like google not have preselected… suggest the
 * clubs first"). Nothing typed: every venue the trip knows, in every
 * destination, clubs first. Words typed: the known venues that match (best
 * match first, matchRank; clubs first among equals), then places anywhere
 * in the world from the place search, then always one last line that adds
 * the typed words as a new venue ("also how do users add a venue???"). A
 * search result with the name of a known venue is left out, so a place
 * picked twice is one place.
 *
 * Inputs: typed — the field's words; known — the known venues, in the
 * order to list them; hits — the place search's suggestions, maybe none
 * (fewer than three characters, the search failed, or it has not answered).
 * Output: the lines, in order.
 * Examples (each is a test in venues.test.ts):
 *   "", known Single Fin (club), Kai's villa (not a club), Savaya (club) → Single Fin, Savaya, Kai's villa
 *   "sav", known Savaya, hits "Savaya" and "Savaya Beach" → Savaya (known), "Savaya Beach" (place), Add "sav"
 *   "zz", no match, no hits → only Add "zz"
 */
export function venueSuggestions(typed: string, known: VenueSpot[], hits: PlaceHit[]): VenueSuggestion[] {
  const words = typed.trim();
  const clubsFirst = (a: { venue: VenueSpot; at: number }, b: { venue: VenueSpot; at: number }) => Number(b.venue.club) - Number(a.venue.club) || a.at - b.at;
  if (!words) {
    return known
      .map((venue, at) => ({ venue, at }))
      .sort(clubsFirst)
      .map(({ venue }) => ({ kind: "known", venue }));
  }
  const ids = new Set(known.map((venue) => idFromName(venue.name)));
  const matched = known
    .map((venue, at) => ({ venue, at, rank: matchRank(venue.name, words) }))
    .filter((entry) => entry.rank < 4)
    .sort((a, b) => a.rank - b.rank || clubsFirst(a, b))
    .map(({ venue }): VenueSuggestion => ({ kind: "known", venue }));
  const fresh = hits.filter((hit) => !ids.has(idFromName(hit.name))).map((hit): VenueSuggestion => ({ kind: "place", hit }));
  return [...matched, ...fresh, { kind: "new", name: words }];
}
