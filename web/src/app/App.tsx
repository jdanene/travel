import { useEffect } from "react";
import { signIn } from "../lib/firebase";

/**
 * The app's one route, /trip/<tripId>. It reads the trip id from the address
 * and draws the page frame around it.
 *
 * Inputs: none. The address bar is the input; the hosting rewrite sends every
 * /trip/** path here.
 * Output: the page frame at phone width with the header line. With no id
 * (/trip/), the frame still shows; the trip page says what is wrong.
 * Examples (checked on screen, not in a test):
 *   /trip/abc  → the frame with "Bali · Koh Phangan · Feb 2027"
 *   /trip/     → the same frame, empty
 */
export function App() {
  // Sign in on load; Trip 4 moves this behind the trip listener.
  useEffect(() => {
    void signIn();
  }, []);

  const tripId = /^\/trip\/([^/?#]+)/.exec(window.location.pathname)?.[1] ?? null;

  return (
    <main className="frame" data-trip={tripId ?? undefined}>
      <p className="cap headline">Bali · Koh Phangan · Feb 2027</p>
    </main>
  );
}
