import { useEffect, useState } from "react";
import { searchPlaces, type PlaceHit, type Spot } from "./placeSearch";

/** How long typing must pause before a search goes out. */
const PAUSE_MS = 300;

/** The fewest characters worth a search. */
export const MIN_CHARS = 3;

/**
 * Suggestions from the place search as the friend types, shared by Add to
 * map's search and Add an event's venue. A search waits for three
 * characters and a 300 ms pause; a newer search cancels the older one.
 *
 * Inputs: words — the field's words, or "" for no search (a pick just
 * filled the field); near — gives the point to lean toward, read when a
 * search goes out (the map's view moves without a render); region — the trip's
 * destination centres, which come first. A new near or region alone does
 * not search again.
 * Output: { hits, state }: "searching" while a search runs, "none" when it
 * found nothing, failed, was slow, or there is no connection, else "idle".
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   "single" near Bali → hits hold "Single Fin · Pecatu, Indonesia"
 *   "zzzz"             → state "none"
 */
export function usePlaceHits(words: string, near: () => Spot, region: Spot[]): { hits: PlaceHit[]; state: "idle" | "searching" | "none" } {
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [state, setState] = useState<"idle" | "searching" | "none">("idle");
  const query = words.trim();

  useEffect(() => {
    setHits([]);
    if (query.length < MIN_CHARS) return setState("idle");
    if (!navigator.onLine) return setState("none");
    setState("searching");
    const stop = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(query, near(), region, stop.signal).then(
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
    // Only new words search; the point and the region are read when they do.
  }, [query]);

  return { hits, state };
}
