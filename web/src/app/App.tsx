import { useEffect } from "react";
import { Notice } from "../components/Notice";
import { readRoute } from "./lib/route";
import { splashAddress } from "./lib/splash";
import { SharedEvents } from "./SharedEvents";
import { TripPage } from "./TripPage";

const route = readRoute(window.location.pathname);
// The trip page's id; the shared events pages open without the splash and never spend its pass.
const tripId = route?.page === "trip" ? route.tripId : null;
// Decided once per page load, outside React: the splash's pass is spent by the first read.
const splash = tripId ? splashAddress(tripId, window.location.search) : null;

/**
 * The app's routes (lib/route.ts): /trip/<tripId>, the trip page, and the
 * shared events pages /trip/<tripId>/events and /trip/<tripId>/events/<showId>.
 * It draws the page frame around them. Only a load of the trip page
 * straight after the splash's button opens the trip; any other load goes
 * to the splash first (lib/splash.ts). The shared events pages open
 * directly: they are the way in for a friend who has not joined.
 *
 * Inputs: none. The address bar is the input; the hosting rewrite sends every
 * /trip/** path here.
 * Output: the page frame at phone width. With no id (/trip/) the frame says
 * the link does not open a trip.
 * Examples (checked on the emulator):
 *   /trip/<id>, after the splash's button  → the trip page
 *   a refresh, or /trip/<id> in a new tab  → the splash, /?t=<id>
 *   /trip/<id>/events in a new tab         → the shared events page, no splash
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
      {route?.page === "trip" ? (
        <TripPage tripId={route.tripId} />
      ) : route ? (
        <SharedEvents tripId={route.tripId} showId={route.page === "event" ? route.showId : undefined} />
      ) : (
        <Notice>This link does not open a trip. Ask the organizer for the link.</Notice>
      )}
    </main>
  );
}
