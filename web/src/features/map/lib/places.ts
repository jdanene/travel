import { insideBox, type Box } from "../../../lib/placeSearch";
import type { DestinationId, PlaceKind } from "../../../types/trip";

/** The "What is it?" chips of Add to map, in order, with their words. */
export const PLACE_KINDS: Array<{ kind: PlaceKind; word: string }> = [
  { kind: "event", word: "Event" },
  { kind: "food", word: "Food" },
  { kind: "beach", word: "Beach" },
  { kind: "activity", word: "Activity" },
  { kind: "other", word: "Other" },
];

/** The longest name of a friend's place, as the rules allow. */
export const PLACE_NAME_MAX = 60;

/**
 * Where a friend may put a place: a box around each destination. The rules
 * hold the same numbers (database.rules.json, places/custom); change both.
 */
const BOXES: Record<DestinationId, Box> = {
  bali: { lat: [-9.0, -8.0], lng: [114.4, 115.8] },
  kohPhangan: { lat: [9.6, 9.85], lng: [99.9, 100.15] },
  // Phuket and Natai Beach in Phang Nga, across the bridge to the north.
  phuket: { lat: [7.7, 8.4], lng: [98.2, 98.5] },
  singapore: { lat: [1.15, 1.48], lng: [103.6, 104.1] },
};

/**
 * Whether a spot lies inside the box around a destination, so a tap in the
 * sea off Bali, or on the next island, is refused before the database
 * refuses it.
 *
 * Inputs: destination — a destination id; lat, lng — the spot tapped.
 * Output: true inside the box, edges included; false outside it or for a
 * destination with no box.
 * Examples (each is a test in places.test.ts):
 *   insideDestination("bali", -8.64, 115.14)          → true   (Canggu)
 *   insideDestination("kohPhangan", 9.53, 100.06)     → false  (Koh Samui, the next island)
 */
export function insideDestination(destination: DestinationId, lat: number, lng: number): boolean {
  const box = BOXES[destination];
  return box ? insideBox(box, lat, lng) : false;
}

/**
 * The box around a destination, for the place search to keep its
 * suggestions inside.
 *
 * Inputs: destination — a destination id.
 * Output: the box, or null for a destination with none (no search then).
 * Examples (checked on screen): destinationBox("bali") → lat -9.0 to -8.0, lng 114.4 to 115.8
 */
export const destinationBox = (destination: DestinationId): Box | null => BOXES[destination] ?? null;

/**
 * The word for a place's kind, for its card: "Food".
 *
 * Inputs: kind — a place kind.
 * Output: the chip's word.
 * Examples (checked on screen): placeWord("beach") → "Beach"
 */
export const placeWord = (kind: PlaceKind) => PLACE_KINDS.find((entry) => entry.kind === kind)?.word ?? "Other";
