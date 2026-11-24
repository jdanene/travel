import { useEffect, useId, useRef, useState } from "react";
import { searchPlaces, type Box, type PlaceHit } from "../lib/placeSearch";
import "./PlaceSearch.css";

/** How long typing must pause before a search goes out. */
const PAUSE_MS = 300;

/** The fewest characters worth a search. */
const MIN_CHARS = 3;

interface PlaceSearchProps {
  /** Where suggestions may sit; results outside are hidden. */
  box: Box;
  /** The destination's centre, so near places come first. */
  near: { lat: number; lng: number };
  /** The friend picked a suggestion. */
  onPick: (hit: PlaceHit) => void;
  /** "Can't find it? Tap the map instead". */
  onTapInstead: () => void;
}

/**
 * Find a place by name: a search box, suggestions as the friend types
 * ("Single Fin · Pecatu"), and a way out to tapping the map. Shared, so any
 * feature that puts a place on the map can use it.
 *
 * A search waits for three characters and a 300 ms pause; a newer search
 * cancels the older one. No suggestion, a failed or slow search (5 s), or
 * no connection all say "No match. Tap the map instead." Suggestions
 * outside the box never show. Photon's credit sits small under the list.
 *
 * Inputs: the box, its centre, what picking does, and what "Tap the map
 * instead" does.
 * Output: the search field, its suggestions, and the fallback.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   "single" in Bali → "Single Fin · Pecatu" among the suggestions; a tap picks it
 *   "zzzz"           → "No match. Tap the map instead."
 */
export function PlaceSearch({ box, near, onPick, onTapInstead }: PlaceSearchProps) {
  const [words, setWords] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [state, setState] = useState<"idle" | "searching" | "none">("idle");
  const listId = useId();
  /** The words a pick wrote into the field; they are not a new search. */
  const pickedWords = useRef<string | null>(null);

  const query = words.trim();
  useEffect(() => {
    setHits([]);
    if (query.length < MIN_CHARS || query === pickedWords.current) return setState("idle");
    if (!navigator.onLine) return setState("none");
    setState("searching");
    const stop = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(query, box, near, stop.signal).then(
        (found) => {
          setHits(found ?? []);
          setState(found && found.length > 0 ? "idle" : "none");
        },
        () => undefined, // Aborted: a newer search is on its way.
      );
    }, PAUSE_MS);
    return () => {
      clearTimeout(timer);
      stop.abort();
    };
    // The box and centre change only with the destination, which remounts this search.
  }, [query]);

  const pick = (hit: PlaceHit) => {
    pickedWords.current = hit.name.trim();
    setWords(hit.name);
    setHits([]);
    setState("idle");
    onPick(hit);
  };

  return (
    <div className="psearch">
      <label className="field">
        <small>Search for a place</small>
        <input
          type="search"
          value={words}
          onChange={(event) => setWords(event.target.value)}
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
        {state === "none" && <p className="psearch-none">No match. Tap the map instead.</p>}
      </div>
      <button type="button" className="psearch-tap" onClick={onTapInstead}>
        Can't find it? Tap the map instead
      </button>
    </div>
  );
}
