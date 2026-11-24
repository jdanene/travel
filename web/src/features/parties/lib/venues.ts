import { idFromName } from "../../../lib/ids";
import { matchRank, type PlaceHit } from "../../../lib/placeSearch";

/** One line in the Venue suggestions: a place the trip knows, or a new place from the search. */
export type VenueSuggestion = { kind: "known"; name: string } | { kind: "place"; hit: PlaceHit };

/**
 * The Venue field's suggestions in Add an event: the places the trip
 * already knows in the destination first (its venues, the venues friends'
 * events name, and friends' places on the map), then new places from the
 * place search. A search result with the name of a known place is left
 * out, so a place picked twice is one place.
 *
 * Inputs: typed — the field's words; known — the known names, in the
 * order to list them; hits — the place search's suggestions, maybe none
 * (the search failed or has not answered).
 * Output: with nothing typed, every known name. Else the known names that
 * match (best match first, matchRank), then the search's suggestions.
 * Examples (each is a test in venues.test.ts):
 *   "sav", known Savaya and Single Fin, hits "Savaya · Pecatu" and "Savaya Beach · Pecatu"
 *     → Savaya (known), then "Savaya Beach" (new)
 *   "", known Savaya and Single Fin, no hits → Savaya, Single Fin
 */
export function venueSuggestions(typed: string, known: string[], hits: PlaceHit[]): VenueSuggestion[] {
  if (!typed.trim()) return known.map((name) => ({ kind: "known", name }));
  const ids = new Set(known.map(idFromName));
  const matched = known
    .map((name, at) => ({ name, at, rank: matchRank(name, typed) }))
    .filter((entry) => entry.rank < 4)
    .sort((a, b) => a.rank - b.rank || a.at - b.at)
    .map(({ name }): VenueSuggestion => ({ kind: "known", name }));
  const fresh = hits.filter((hit) => !ids.has(idFromName(hit.name))).map((hit): VenueSuggestion => ({ kind: "place", hit }));
  return [...matched, ...fresh];
}
