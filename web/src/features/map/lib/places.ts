import type { PlaceKind } from "../../../types/trip";

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
 * The word for a place's kind, for its card: "Food".
 *
 * Inputs: kind — a place kind.
 * Output: the chip's word.
 * Examples (checked on screen): placeWord("beach") → "Beach"
 */
export const placeWord = (kind: PlaceKind) => PLACE_KINDS.find((entry) => entry.kind === kind)?.word ?? "Other";
