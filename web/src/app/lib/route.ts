/** What an address opens: the trip, all its events, or one event. */
export type Route =
  | { page: "trip"; tripId: string }
  | { page: "events"; tripId: string }
  | { page: "event"; tripId: string; showId: string };

const ID = /^[A-Za-z0-9_-]+$/;
/** A show's id: letters, digits, "_" and "-", at most 200 characters. */
const SHOW_ID = /^[A-Za-z0-9_-]{1,200}$/;

/**
 * Reads the route from the address's path. The hosting rewrite sends every
 * /trip/** path to the app. /trip/<id> is the trip page; /trip/<id>/events
 * and /trip/<id>/events/<showId> are the shared events pages, which a
 * friend outside the crew may open (owner, 25 Nov 2026). The event's id is
 * decoded once; a part that does not decode, or holds other characters,
 * opens nothing.
 *
 * Inputs: pathname — window.location.pathname.
 * Output: the route, or null when the path opens nothing.
 * Examples (each is a test in route.test.ts):
 *   "/trip/abc"                    → { page: "trip", tripId: "abc" }
 *   "/trip/abc/events/"            → { page: "events", tripId: "abc" }
 *   "/trip/abc/events/bali_2027-02-13_savaya_peggy-gou" → { page: "event", tripId: "abc", showId: "bali_2027-02-13_savaya_peggy-gou" }
 *   "/trip/abc/events/%E0%A4%A"    → null (a part that does not decode)
 *   "/trip/a%2Fb"                  → null
 */
export function readRoute(pathname: string): Route | null {
  const parts = pathname.split("/").filter((part, index, all) => part !== "" || (index > 0 && index < all.length - 1));
  // A trailing "/" is allowed; an empty part in the middle ("//") is not.
  if (parts[0] !== "trip" || parts.length < 2 || parts.length > 4) return null;
  const [, tripId, events, rawShow] = parts;
  if (!ID.test(tripId)) return null;
  if (parts.length === 2) return { page: "trip", tripId };
  if (events !== "events") return null;
  if (rawShow === undefined) return { page: "events", tripId };
  let showId: string;
  try {
    showId = decodeURIComponent(rawShow);
  } catch {
    return null;
  }
  return SHOW_ID.test(showId) ? { page: "event", tripId, showId } : null;
}
