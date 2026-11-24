/**
 * Finding a place by name, for any feature that puts a place on the map
 * (the Map's "Add to map" now, a new venue next). Shared, so no feature
 * imports another.
 *
 * The search is Photon (https://photon.komoot.io): free, no key, built on
 * OpenStreetMap data. Its terms ask for fair use, so a search waits for
 * three characters and a pause, asks for five results, and never retries.
 * It sends the words typed and the destination's box and centre, nothing
 * else: no referrer, so the trip's address never leaves the page.
 */

/** A box around a destination: where its places may sit. */
export interface Box {
  lat: [south: number, north: number];
  lng: [west: number, east: number];
}

/** One suggestion: "Single Fin" in "Pecatu", and where it is. */
export interface PlaceHit {
  name: string;
  area?: string;
  lat: number;
  lng: number;
}

const PHOTON = "https://photon.komoot.io/api/";

/** The most suggestions shown. */
export const HITS_MAX = 5;

/** How long a search may take before the page says "No match. Tap the map instead." */
export const SEARCH_WAIT_MS = 5000;

/**
 * Whether a spot lies inside a box, edges included.
 *
 * Inputs: box, and the spot's lat and lng.
 * Output: true inside, false outside.
 * Examples (checked through placeHits() in placeSearch.test.ts):
 *   Bali's box, Canggu (-8.64, 115.14) → true
 */
export const insideBox = (box: Box, lat: number, lng: number) =>
  lat >= box.lat[0] && lat <= box.lat[1] && lng >= box.lng[0] && lng <= box.lng[1];

/**
 * Turns Photon's answer into suggestions: a name, its area, and where it
 * is. Results outside the box are hidden, as are results with no name, and
 * a second result with the same name and area (Photon often lists a bar
 * and its restaurant at one spot).
 *
 * Inputs: answer — Photon's GeoJSON; box — the destination's box.
 * Output: at most five suggestions, in Photon's order. The area is the
 * district, else the locality, else the city.
 * Examples (each is a test in placeSearch.test.ts):
 *   Single Fin as a restaurant and as a bar in Pecatu, and a Single Fin in Australia
 *     → one suggestion: { name: "Single Fin", area: "Pecatu", lat: -8.815, lng: 115.0889 }
 *   a result with no name → nothing
 */
export function placeHits(answer: unknown, box: Box): PlaceHit[] {
  const features = (answer as { features?: unknown[] } | null)?.features ?? [];
  const hits: PlaceHit[] = [];
  for (const feature of features as Array<{ geometry?: { coordinates?: number[] }; properties?: Record<string, unknown> }>) {
    const [lng, lat] = feature.geometry?.coordinates ?? [];
    const props = feature.properties ?? {};
    const name = typeof props.name === "string" ? props.name.trim() : "";
    if (!name || typeof lat !== "number" || typeof lng !== "number" || !insideBox(box, lat, lng)) continue;
    const area = [props.district, props.locality, props.city].find((value): value is string => typeof value === "string" && value !== "");
    if (hits.some((hit) => hit.name === name && hit.area === area)) continue;
    hits.push({ name, ...(area ? { area } : {}), lat, lng });
    if (hits.length === HITS_MAX) break;
  }
  return hits;
}

/**
 * Asks Photon for places matching the words, inside the box and near its
 * centre. It gives up after five seconds.
 *
 * Inputs: words — at least three characters; box — the destination's box;
 * near — its centre; signal — aborts a search the friend typed past.
 * Output: the suggestions (placeHits), or null when Photon failed, was
 * slow, or there is no connection. An aborted search rejects.
 * Examples (checked on the emulator): "single fin" in Bali → "Single Fin · Pecatu"
 */
export async function searchPlaces(words: string, box: Box, near: { lat: number; lng: number }, signal: AbortSignal): Promise<PlaceHit[] | null> {
  const url = new URL(PHOTON);
  url.searchParams.set("q", words.trim());
  url.searchParams.set("lat", String(near.lat));
  url.searchParams.set("lon", String(near.lng));
  url.searchParams.set("limit", String(HITS_MAX));
  url.searchParams.set("bbox", [box.lng[0], box.lat[0], box.lng[1], box.lat[1]].join(","));
  // One controller for both endings (older phones lack AbortSignal.any).
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), SEARCH_WAIT_MS);
  const cancel = () => stop.abort();
  signal.addEventListener("abort", cancel);
  try {
    const response = await fetch(url, { signal: stop.signal, referrerPolicy: "no-referrer", credentials: "omit" });
    if (!response.ok) return null;
    return placeHits(await response.json(), box);
  } catch (error) {
    if (signal.aborted) throw error;
    return null;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}
