import { Notice } from "../components/Notice";
import { crewOf } from "../features/crew/api/crew";
import { Invitation } from "../features/crew/components/Invitation";
import { useTrip } from "../lib/useTrip";
import type { Trip } from "../types/trip";
import { Home } from "./Home";

/**
 * The trip page, kept a thin composition so its layout changes in one
 * place: a failure notice, or the invitation (12/1) before a reply, or the
 * home page (12/2) after it.
 *
 * Inputs: tripId — from the address bar.
 * Output: the page, or one notice when the trip cannot be shown.
 * Examples (checked on the emulator at 390 px):
 *   a new device    → the invitation
 *   after a reply   → the home page
 *   /trip/wrong     → "This link does not open a trip. Ask the organizer for the link."
 *   emulator down   → "No connection" after 5 seconds
 */
export function TripPage({ tripId }: { tripId: string }) {
  const state = useTrip(tripId);

  switch (state.status) {
    case "loading":
      return <div aria-busy="true" />;
    case "offline":
      return <Notice>No connection</Notice>;
    case "notFound":
      return <Notice>This link does not open a trip. Ask the organizer for the link.</Notice>;
    case "failed":
      return (
        <Notice detail={state.reason} onRetry={state.retry}>
          No connection
        </Notice>
      );
    case "ready":
      return <ReadyPage trip={state.trip} uid={state.uid} offline={state.offline} />;
  }
}

function ReadyPage({ trip, uid, offline }: { trip: Trip; uid: string; offline: boolean }) {
  const crew = crewOf(trip, uid);
  const onReply = () => {}; // Trip 6 opens the join sheet here.

  return (
    <>
      {offline && <Notice>No connection</Notice>}
      {/* Before a reply the friend sees the invitation (12/1). A friend who
          can't make it sees it again with that reply pressed, and the modules below. */}
      {(!crew.member || crew.member.reply === "out") && <Invitation info={trip.info} crew={crew} onReply={onReply} />}
      {crew.member && <Home trip={trip} memberId={crew.memberId} organizer={crew.organizer} />}
    </>
  );
}
