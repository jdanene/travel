import type { DestinationId, TripInfo } from "../../../types/trip";

/**
 * The parties context's rule for the Events country filter (owner, 25 Nov
 * 2026: "we need to be able to filter events by country. The default is all
 * country"). An event has no country of its own: it lists under one of the
 * trip's destinations (the rules refuse any other), and the destination
 * carries the country (info/destinations, from data/places.json). So the
 * chips follow the destinations that hold something, and a new country
 * shows as soon as one of its destinations does.
 */

/** What the Events list shows by place: one country's name, or "all". */
export type CountryFilter = string;

type Destinations = TripInfo["destinations"] | undefined;

/**
 * The country a destination lies in, trimmed.
 *
 * Inputs: destinations — info/destinations, which may be missing; id — a destination id.
 * Output: the country, or undefined for an unknown destination or one with no country.
 * Examples (checked through countryChips() in countries.test.ts):
 *   bali → "Indonesia"; an id the trip does not have → undefined
 */
function countryOf(destinations: Destinations, id: DestinationId): string | undefined {
  return destinations?.[id]?.country?.trim() || undefined;
}

/**
 * The country chips after "All countries": one per country whose
 * destinations hold an event or a venue the trip knows, in the order of the
 * trip's destinations, each country once. A destination the trip does not
 * have, or one with no country, makes no chip; its events show under "All
 * countries" only.
 *
 * Inputs: destinations — info/destinations; listed — the destination of
 * every event (parties/shows) and every known venue (places/venues).
 * Output: the countries, in that order; empty when nothing is listed.
 * Examples (each is a test in countries.test.ts):
 *   Phuket, Singapore and Bali events, a Koh Phangan venue → Indonesia, Thailand, Singapore
 *   an event at a destination with no country, one in Bali → Indonesia
 */
export function countryChips(destinations: Destinations, listed: Array<{ destination: DestinationId }>): string[] {
  const holding = new Set(listed.map((place) => place.destination));
  const countries = Object.keys(destinations ?? {})
    .filter((id) => holding.has(id))
    .map((id) => countryOf(destinations, id))
    .filter((country): country is string => country !== undefined);
  return [...new Set(countries)];
}

/**
 * The country the list opens on: the device's last pick while it is a
 * chip and there are two chips or more (one country leaves nothing to
 * filter, and its row is hidden), else "all".
 *
 * Inputs: stored — the device's last pick, or null; chips — countryChips().
 * Output: a chip's country, or "all".
 * Examples (each is a test in countries.test.ts):
 *   "Thailand" stored, chips Indonesia, Thailand → "Thailand"
 *   "Australia" stored, its events removed      → "all"
 */
export function pickCountry(stored: string | null, chips: string[]): CountryFilter {
  return chips.length > 1 && stored !== null && chips.includes(stored) ? stored : "all";
}

/**
 * Says whether the list keeps a destination's venues and events under a
 * country: "all" keeps every destination, known or not.
 *
 * Inputs: country — the filter; destinations — info/destinations; id — the destination.
 * Output: true when the list keeps it.
 * Examples (each is a test in countries.test.ts):
 *   "Thailand", phuket          → true
 *   "Thailand", an unknown id   → false; under "all" → true
 */
export function inCountry(country: CountryFilter, destinations: Destinations, id: DestinationId): boolean {
  return country === "all" || countryOf(destinations, id) === country;
}
