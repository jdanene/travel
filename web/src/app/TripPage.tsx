import { Notice } from "../components/Notice";
import { crewOf, useOrganizerLink, type CrewView } from "../features/crew/api/crew";
import { Invitation } from "../features/crew/components/Invitation";
import { DatesModule } from "../features/dates/components/DatesModule";
import { useTrip } from "../lib/useTrip";
import type { Trip } from "../types/trip";
import type { ReactNode } from "react";
import { Home } from "./Home";
import type { ModuleId } from "./lib/modules";

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
      return <ReadyPage tripId={tripId} trip={state.trip} uid={state.uid} offline={state.offline} />;
  }
}

function ReadyPage({ tripId, trip, uid, offline }: { tripId: string; trip: Trip; uid: string; offline: boolean }) {
  const crew = crewOf(trip, uid);
  const organizerLink = useOrganizerLink(tripId, uid, crew);

  return (
    <>
      {offline && <Notice>No connection</Notice>}
      {organizerLink === "invalid" && <Notice>This organizer link is not valid.</Notice>}
      {/* Before a reply the friend sees the invitation (12/1). A friend who
          can't make it sees it again with that reply pressed, and the modules below. */}
      {(!crew.member || crew.member.reply === "out") && <Invitation tripId={tripId} uid={uid} info={trip.info} crew={crew} />}
      {crew.member && (
        <>
          <Home trip={trip} memberId={crew.memberId} organizer={crew.organizer} content={moduleSlots(tripId, trip, crew)} />
        </>
      )}
    </>
  );
}

/**
 * What each module shows when open: one slot per module, so each module's
 * ticket plugs in here without touching the home page's layout.
 *
 * Inputs: the trip id, the trip and the crew view of this device.
 * Output: the content for each module; null until its ticket fills it.
 * Examples (checked on screen): the Dates slot holds the Dates module.
 */
function moduleSlots(tripId: string, trip: Trip, crew: CrewView): Record<ModuleId, ReactNode> {
  return {
    dates: crew.memberId && (
      <DatesModule
        tripId={tripId}
        info={trip.info}
        dates={trip.dates}
        expected={crew.expected}
        members={crew.byId}
        memberId={crew.memberId}
        isOrganizer={crew.isOrganizer}
      />
    ), // Trip 7: the Dates module.
    stay: null, // Trip 9: the Stay module.
    parties: null, // Trip 11: the Parties module.
    links: null, // Trip 16: the Links module.
    map: null, // Trip 12: the Map module.
  };
}
