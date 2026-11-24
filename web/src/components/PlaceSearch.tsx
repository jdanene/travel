import { useId, useRef, useState } from "react";
import type { PlaceHit, Spot } from "../lib/placeSearch";
import { usePlaceHits } from "../lib/usePlaceHits";
import "./PlaceSearch.css";

interface PlaceSearchProps {
  /** Gives the point suggestions lean toward: the map's view. */
  near: () => Spot;
  /** The trip's destination centres; matches near them come first. */
  region: Spot[];
  /** The friend picked a suggestion. */
  onPick: (hit: PlaceHit) => void;
  /** "Can't find it? Tap the map instead". */
  onTapInstead: () => void;
}

/**
 * Find a place by name: a search box, suggestions as the friend types
 * ("Single Fin · Pecatu, Indonesia"), and a way out to tapping the map.
 * Shared, so any feature that puts a place on the map can use it.
 *
 * Any kind of place anywhere in the world; matches near the trip's
 * destinations come first (lib/placeSearch.ts). Searching waits and cancels
 * as usePlaceHits() says. No suggestion, a failed or slow search (5 s), or
 * no connection all say "No match. Tap the map instead." Photon's credit
 * sits small under the list.
 *
 * Inputs: the point to lean toward, the trip's destination centres, what
 * picking does, and what "Tap the map instead" does.
 * Output: the search field, its suggestions, and the fallback.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   "single" over Bali → "Single Fin · Pecatu, Indonesia" among the suggestions; a tap picks it
 *   "zzzz"             → "No match. Tap the map instead."
 */
export function PlaceSearch({ near, region, onPick, onTapInstead }: PlaceSearchProps) {
  const [words, setWords] = useState("");
  const listId = useId();
  /** The words a pick wrote into the field; they are not a new search. */
  const pickedWords = useRef<string | null>(null);
  const { hits: found, state } = usePlaceHits(words.trim() === pickedWords.current ? "" : words, near, region);
  const [hidden, setHidden] = useState(false);
  const hits = hidden ? [] : found;

  const pick = (hit: PlaceHit) => {
    pickedWords.current = hit.name.trim();
    setWords(hit.name);
    setHidden(true);
    onPick(hit);
  };

  return (
    <div className="psearch">
      <label className="field">
        <small>Search for a place</small>
        <input
          type="search"
          value={words}
          onChange={(event) => {
            setHidden(false);
            setWords(event.target.value);
          }}
          autoComplete="off"
          autoFocus
          enterKeyHint="search"
          aria-controls={listId}
          aria-busy={state === "searching"}
        />
      </label>
      <div id={listId} aria-live="polite">
        {hits.length > 0 && (
          <>
            <ul className="psearch-hits">
              {hits.map((hit) => (
                <li key={`${hit.name}|${hit.area ?? ""}|${hit.lat}`}>
                  <button type="button" onClick={() => pick(hit)}>
                    <b>{hit.name}</b>
                    {hit.area && <span> · {hit.area}</span>}
                  </button>
                </li>
              ))}
            </ul>
            <p className="psearch-credit">Search by Photon · © OpenStreetMap</p>
          </>
        )}
        {state === "none" && !hidden && <p className="psearch-none">No match. Tap the map instead.</p>}
      </div>
      <button type="button" className="psearch-tap" onClick={onTapInstead}>
        Can't find it? Tap the map instead
      </button>
    </div>
  );
}
