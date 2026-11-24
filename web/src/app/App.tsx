import { Notice } from "../components/Notice";
import { TripPage } from "./TripPage";

/**
 * The app's one route, /trip/<tripId>. It reads the trip id from the address
 * and draws the page frame around the trip page.
 *
 * Inputs: none. The address bar is the input; the hosting rewrite sends every
 * /trip/** path here.
 * Output: the page frame at phone width. With no id (/trip/) the frame says
 * the link does not open a trip.
 * Examples (checked on the emulator):
 *   /trip/<id>  → the trip page
 *   /trip/, or an id with other characters (/trip/a%2Fb)
 *               → "This link does not open a trip. Ask the organizer for the link."
 */
export function App() {
  const tripId = /^\/trip\/([A-Za-z0-9_-]+)\/?$/.exec(window.location.pathname)?.[1] ?? null;

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
