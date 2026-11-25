/**
 * Finding a place by name, for any feature that puts a place on the map
 * (the Map's "Add to map" and Add an event's venue). Shared, so no feature
 * imports another.
 *
 * The search is Photon (https://photon.komoot.io): free, no key, built on
 * OpenStreetMap data. It covers any kind of place (a beach, a restaurant, a
 * hotel, a viewpoint, a street address) anywhere in the world. Matches in or
 * near the trip's destinations come first, then matches anywhere else;
 * nothing is excluded. The friend's own location is never used.
 *
 * Its terms ask for fair use, so a search waits for three characters and a
 * pause, and sends at most two requests: one biased toward the place the
 * friend is looking at, and one unbiased when the first finds fewer than
 * five. It sends the words typed and that point, nothing else: no referrer,
 * so the trip's address never leaves the page.
 */

/** A point on the map. */
export interface Spot {
  lat: number;
  lng: number;
}

/** One suggestion: "Single Fin" in "Pecatu, Indonesia", and where it is. */
export interface PlaceHit {
  name: string;
  area?: string;
  lat: number;
  lng: number;
}

const PHOTON = "https://photon.komoot.io/api/";

/** The most suggestions shown. */
export const HITS_MAX = 5;

/** How many results each request asks Photon for; duplicates and nameless ones fall out before the cut to five. */
const ASK = 10;

/** How long a search may take before the page says "No match. Tap the map instead." */
export const SEARCH_WAIT_MS = 5000;

/** How far from a destination's centre a place still counts as in the trip's region. */
const REGION_KM = 150;

/** Latin letters, digits, punctuation and spaces: an area name every friend can read. */
const READABLE = /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}]+$/u;

/**
 * The distance between two spots over the earth's surface, in kilometres.
 *
 * Inputs: two spots.
 * Output: kilometres, rounded nowhere.
 * Examples (checked through nearestDestination() in placeSearch.test.ts):
 *   Canggu to Bali's centre → about 40 km
 */
function km(a: Spot, b: Spot): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The trip destination nearest a spot, so a place picked anywhere in the
 * world still groups under one destination on the map and in Events.
 *
 * Inputs: destinations — each with its id and centre (one without a centre
 * is skipped); spot — the place.
 * Output: the nearest destination's id, or undefined when none has a centre.
 * Examples (each is a test in placeSearch.test.ts):
 *   Canggu (-8.65, 115.13) among Bali, Koh Phangan, Phuket, Singapore, Koh Samui → "bali"
 *   CLUB SEEN in Chaweng (9.52, 100.06), 25 km south of Koh Phangan           → "kohSamui"
 *   Bangkok (13.75, 100.5), far from all five                                → "kohPhangan"
 */
export function nearestDestination(destinations: Array<{ id: string; lat?: number; lng?: number }>, spot: Spot): string | undefined {
  let best: { id: string; far: number } | undefined;
  for (const { id, lat, lng } of destinations) {
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    const far = km({ lat, lng }, spot);
    if (!best || far < best.far) best = { id, far };
  }
  return best?.id;
}

/** Lower case, accents folded, every run of other characters one space. */
const fold = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/**
 * How well a name matches what the friend typed, as a rank: lower is
 * better. Ignores case, accents and punctuation.
 *
 * Inputs: name — a place's name; typed — the words in the field.
 * Output: 0 the same words; 1 the name starts with them; 2 every typed
 * word starts a word of the name; 3 the name holds every typed word;
 * 4 anything else.
 * Examples (each is a test in placeSearch.test.ts):
 *   matchRank("Single Fin", "single fin")      → 0
 *   matchRank("Single Fin Bali", "single f")   → 1
 *   matchRank("The Single Fin", "fin sing")    → 2
 *   matchRank("Starbucks", "313 orchard")      → 4
 */
export function matchRank(name: string, typed: string): number {
  const n = fold(name);
  const q = fold(typed);
  if (!q) return 4;
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  const words = n.split(" ");
  const asked = q.split(" ");
  if (asked.every((word) => words.some((own) => own.startsWith(word)))) return 2;
  if (asked.every((word) => n.includes(word))) return 3;
  return 4;
}

/**
 * Turns Photon's answer into suggestions: a name, its area, and where it
 * is. A result with no name takes its address ("313 Orchard Road") when it
 * has one, else it is dropped; a second result with the same name and area
 * is dropped (Photon often lists a bar and its restaurant at one spot, or a
 * path in several pieces).
 *
 * Inputs: answer — Photon's GeoJSON.
 * Output: every suggestion, in Photon's order. The area is the first of
 * district, locality and city that is written in Latin letters, then the
 * country: "Pecatu, Indonesia".
 * Examples (each is a test in placeSearch.test.ts):
 *   Single Fin as a restaurant and as a bar in Pecatu, Indonesia
 *     → one suggestion: { name: "Single Fin", area: "Pecatu, Indonesia", lat: -8.815, lng: 115.0889 }
 *   an ATM with no name at 313 Orchard Road → { name: "313 Orchard Road", … }
 */
export function placeHits(answer: unknown): PlaceHit[] {
  const features = (answer as { features?: unknown[] } | null)?.features ?? [];
  const hits: PlaceHit[] = [];
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  for (const feature of features as Array<{ geometry?: { coordinates?: number[] }; properties?: Record<string, unknown> }>) {
    const [lng, lat] = feature.geometry?.coordinates ?? [];
    const props = feature.properties ?? {};
    const address = text(props.housenumber) && text(props.street) ? `${text(props.housenumber)} ${text(props.street)}` : "";
    const name = text(props.name) || address;
    if (!name || typeof lat !== "number" || typeof lng !== "number") continue;
    const local = [props.district, props.locality, props.city]
      .map((value) => text(value).split(",")[0].trim())
      .find((value) => value !== "" && value !== name && READABLE.test(value));
    const country = text(props.country);
    const area = [local, country && READABLE.test(country) ? country : ""].filter(Boolean).join(", ");
    if (hits.some((hit) => hit.name === name && (hit.area ?? "") === area)) continue;
    hits.push({ name, ...(area ? { area } : {}), lat, lng });
  }
  return hits;
}

/**
 * Orders suggestions for someone planning this trip: the ones within
 * 150 km of a destination first, then the rest of the world; inside each,
 * the best name match first (matchRank), else Photon's order. Keeps five.
 *
 * Inputs: hits — the suggestions, in Photon's order; typed — the words;
 * region — the trip's destination centres.
 * Output: at most five suggestions.
 * Examples (each is a test in placeSearch.test.ts):
 *   "single fin": a Single Fin in Australia, then one in Pecatu → Pecatu first
 */
export function orderHits(hits: PlaceHit[], typed: string, region: Spot[]): PlaceHit[] {
  const near = (hit: PlaceHit) => (region.some((centre) => km(centre, hit) <= REGION_KM) ? 0 : 1);
  return hits
    .map((hit, at) => ({ hit, at, near: near(hit), rank: matchRank(hit.name, typed) }))
    .sort((a, b) => a.near - b.near || a.rank - b.rank || a.at - b.at)
    .slice(0, HITS_MAX)
    .map(({ hit }) => hit);
}

/**
 * Asks Photon for places matching the words: first near a point (the
 * destination picked, or the map's view), then, when that finds fewer than
 * five, anywhere. Each request gives up after five seconds.
 *
 * Inputs: words — at least three characters; near — the point to lean
 * toward; region — the trip's destination centres, which come first;
 * signal — aborts a search the friend typed past.
 * Output: the suggestions (orderHits), or null when Photon failed, was
 * slow, or there is no connection. An aborted search rejects.
 * Examples (checked on the emulator): "single fin" near Bali → "Single Fin · Pecatu, Indonesia" first
 */
export async function searchPlaces(words: string, near: Spot, region: Spot[], signal: AbortSignal): Promise<PlaceHit[] | null> {
  const biased = await ask(words, near, signal);
  if (biased === null) return null;
  let hits = placeHits(biased);
  if (hits.length < HITS_MAX) {
    const anywhere = await ask(words, null, signal);
    if (anywhere !== null) hits = placeHits({ features: [...(biased.features ?? []), ...(anywhere.features ?? [])] });
  }
  return orderHits(hits, words, region);
}

/** One Photon request; null when it failed, was slow or there is no connection. An abort by the friend rejects. */
async function ask(words: string, near: Spot | null, signal: AbortSignal): Promise<{ features?: unknown[] } | null> {
  const url = new URL(PHOTON);
  url.searchParams.set("q", words.trim());
  url.searchParams.set("limit", String(ASK));
  url.searchParams.set("lang", "en");
  if (near) {
    url.searchParams.set("lat", String(near.lat));
    url.searchParams.set("lon", String(near.lng));
  }
  // One controller for both endings (older phones lack AbortSignal.any).
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), SEARCH_WAIT_MS);
  const cancel = () => stop.abort();
  signal.addEventListener("abort", cancel);
  try {
    const response = await fetch(url, { signal: stop.signal, referrerPolicy: "no-referrer", credentials: "omit" });
    if (!response.ok) return null;
    return (await response.json()) as { features?: unknown[] };
  } catch (error) {
    if (signal.aborted) throw error;
    return null;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}
