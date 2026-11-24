import { useEffect } from "react";
import { Notice } from "../components/Notice";
import { splashAddress } from "./lib/splash";
import { TripPage } from "./TripPage";

const tripId = /^\/trip\/([A-Za-z0-9_-]+)\/?$/.exec(window.location.pathname)?.[1] ?? null;
// Decided once per page load, outside React: the splash's pass is spent by the first read.
const splash = tripId ? splashAddress(tripId, window.location.search) : null;

/**
 * The app's one route, /trip/<tripId>. It reads the trip id from the address
 * and draws the page frame around the trip page. Only a load straight after
 * the splash's button opens the trip; any other load goes to the splash
 * first (lib/splash.ts).
 *
 * Inputs: none. The address bar is the input; the hosting rewrite sends every
 * /trip/** path here.
 * Output: the page frame at phone width. With no id (/trip/) the frame says
 * the link does not open a trip.
 * Examples (checked on the emulator):
 *   /trip/<id>, after the splash's button  → the trip page
 *   a refresh, or /trip/<id> in a new tab  → the splash, /?t=<id>
 *   /trip/, or an id with other characters (/trip/a%2Fb)
 *               → "This link does not open a trip. Ask the organizer for the link."
 */
export function App() {
  // replace, not assign: Back from the splash must not land here and bounce again.
  useEffect(() => {
    if (splash) window.location.replace(splash);
  }, []);

  // Back from another site may restore this page from the browser's cache without loading it: send that to the splash too.
  useEffect(() => {
    if (!tripId) return;
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.replace(`/?${new URLSearchParams({ t: tripId })}`);
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  if (splash) return null;

  return (
    <main className="frame">
      {tripId ? (
        <TripPage tripId={tripId} />
      ) : (
        <Notice>This link does not open a trip. Ask the organizer for the link.</Notice>
      )}
    </main>
  );
}
