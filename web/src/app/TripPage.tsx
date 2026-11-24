import { PhotosProvider } from "../components/Avatars";
import { Notice } from "../components/Notice";
import { crewOf, useOrganizerLink, type CrewView } from "../features/crew/api/crew";
import { Invitation } from "../features/crew/components/Invitation";
import { OrganizerSignIn } from "../features/crew/components/OrganizerSignIn";
import { PhotoSheet } from "../features/crew/components/PhotoSheet";
import { repliedLine } from "../features/crew/lib/crew";
import { DatesModule } from "../features/dates/components/DatesModule";
import { StayModule } from "../features/stay/components/StayModule";
import { LinksModule } from "../features/links/components/LinksModule";
import type { MapDestination } from "../features/map/components/TripMap";
import { PartiesBlock } from "../features/parties/components/PartiesBlock";
import type { MapPlace } from "../features/parties/lib/detail";
import { pins } from "./lib/pins";
import { useTrip } from "../lib/useTrip";
import type { Trip } from "../types/trip";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { CheckEventsLine, useEventCheck, type EventCheck } from "./CheckEvents";
import { Home } from "./Home";
import { clearSmoke } from "./lib/smoke";
import type { ModuleId } from "./lib/modules";

/**
 * The trip page, kept a thin composition so its layout changes in one
 * place: a failure notice, or the invitation (12/1) before a reply, or the
 * home page (12/2) after it, and "Organizer sign-in" at the foot for a
 * device that is not an organizer.
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
  // The smoke from the splash clears once there is something to show: the trip, or why it cannot be shown.
  useEffect(() => {
    if (state.status !== "loading") clearSmoke();
  }, [state.status]);

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
  // The pin the show sheet's "See on the map" asked for. The map reads it once, as it mounts; FocusedMap
  // clears it then, so a later tap on the Map button opens the map as it was.
  const [mapFocus, setMapFocus] = useState<string | null>(null);
  // The events check runs once a friend has joined; a friend who can't make it still sees the list.
  const eventCheck = useEventCheck(tripId, trip, crew.member ? crew.memberId : null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const you = crew.memberId && crew.member ? { id: crew.memberId, name: crew.member.name } : undefined;

  return (
    <PhotosProvider photos={crew.photos}>
      {offline && <Notice>No connection</Notice>}
      {organizerLink === "invalid" && <Notice>This organizer link is not valid.</Notice>}
      {/* Before a reply the friend sees the invitation (12/1). A friend who
          can't make it sees it again with that reply pressed, and the modules below. */}
      {(!crew.member || crew.member.reply === "out") && <Invitation tripId={tripId} uid={uid} info={trip.info} crew={crew} />}
      {crew.member && (
        <>
          <Home
            trip={trip}
            memberId={crew.memberId}
            organizer={crew.organizer}
            you={you}
            onYou={() => setPhotoOpen(true)}
            replied={repliedLine(crew.expected, crew.byId)}
            content={(openModule) =>
              moduleSlots(tripId, trip, crew, eventCheck, openModule, { pin: mapFocus, clear: () => setMapFocus(null) }, (place) => {
                setMapFocus(place ? `${place.kind}:${place.id}` : null);
                openModule("map");
              })
            }
          />
        </>
      )}
      {/* The organizer signs in with Google from any phone (D15); an organizer no longer needs it. */}
      {!crew.isOrganizer && <OrganizerSignIn tripId={tripId} />}
      {crew.memberId && crew.member && (
        <PhotoSheet open={photoOpen} tripId={tripId} memberId={crew.memberId} member={crew.member} onClose={() => setPhotoOpen(false)} />
      )}
    </PhotosProvider>
  );
}

/**
 * What each module shows when open: one slot per module, so each module's
 * ticket plugs in here without touching the home page's layout.
 *
 * Inputs: the trip id, the trip, the crew view of this device, the events
 * check (its line sits at the foot of Events for the organizer), a way to
 * open another module, the pin the map should open on, and a way to open
 * the map (on one place, or as it was).
 * Output: the content for each module; null until its ticket fills it.
 * Examples (checked on screen): the Dates slot holds the Dates module.
 */
/** The map loads on its first opening, so Leaflet stays out of the first page load. */
const TripMap = lazy(() => import("../features/map/components/TripMap").then((module) => ({ default: module.TripMap })));

function moduleSlots(
  tripId: string,
  trip: Trip,
  crew: CrewView,
  eventCheck: EventCheck,
  openModule: (id: ModuleId) => void,
  mapFocus: { pin: string | null; clear: () => void },
  seeMap: (place?: MapPlace) => void,
): Record<ModuleId, ReactNode> {
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
    stay: crew.memberId && (
      <StayModule
        tripId={tripId}
        stay={trip.stay}
        destinations={destinationList(trip)}
        areas={Object.values(trip.places?.areas ?? {})}
        names={Object.fromEntries(crew.members.map((member) => [member.id, member.name]))}
        memberId={crew.memberId}
        isOrganizer={crew.isOrganizer}
      />
    ), // Trip 9: the Stay module.
    parties: (
      <>
        <PartiesBlock tripId={tripId} trip={trip} memberId={crew.memberId} isOrganizer={crew.isOrganizer} onSeeMap={seeMap} />
        {crew.isOrganizer && <CheckEventsLine check={eventCheck} lastAt={trip.parties?.lastCheck?.at} />}
      </>
    ), // Trip 11: the Events module (code: parties). A show's sheet opens the map on its venue; the organizer's events check sits at its foot.
    links: crew.memberId && (
      <LinksModule
        tripId={tripId}
        links={trip.links}
        destinations={destinationList(trip)}
        names={Object.fromEntries(crew.members.map((member) => [member.id, member.name]))}
        memberId={crew.memberId}
        isOrganizer={crew.isOrganizer}
      />
    ), // Trip 16: the Links module.
    map: (
      <Suspense fallback={<div className="map-wait" aria-busy="true" />}>
        <FocusedMap focus={mapFocus}>
          <TripMap
            tripId={tripId}
            destinations={mapDestinations(trip)}
            pins={pins(trip)}
            memberId={crew.memberId}
            isOrganizer={crew.isOrganizer}
            focus={mapFocus.pin ?? undefined}
            onOpen={(pin) => openModule(pin.kind === "stay" ? "stay" : "parties")}
          />
        </FocusedMap>
      </Suspense>
    ), // Trip 12: the Map module. A stay card opens Stay; a venue card opens Parties.
  };
}

/**
 * Hands the map its focus pin once. It sits inside the map's Suspense, so
 * its effect runs only after the lazy map has loaded and read the pin; then
 * it clears the pin, and a later tap on the Map button opens the map as it was.
 *
 * Inputs: focus — the pin and how to clear it; children — the map.
 * Output: the map.
 * Examples (checked on the emulator): "See on the map" on Peggy Gou → Savaya's card open; Map button later → all Bali pins
 */
function FocusedMap({ focus, children }: { focus: { pin: string | null; clear: () => void }; children: ReactNode }) {
  useEffect(() => {
    if (focus.pin) focus.clear();
    // Once per mount: the map reads its focus only as it mounts.
  }, []);
  return <>{children}</>;
}

/**
 * The destinations the map switches between, with their centres, in the
 * trip file's order. A destination with no centre is left out.
 *
 * Inputs: the trip.
 * Output: { id, name, lat, lng } for each destination.
 * Examples (checked on screen): the example trip → Bali, then Koh Phangan
 */
function mapDestinations(trip: Trip): MapDestination[] {
  return Object.entries(trip.info?.destinations ?? {})
    .filter(([, place]) => place.lat !== undefined && place.lng !== undefined)
    .map(([id, place]) => ({ id, name: place.name, lat: place.lat!, lng: place.lng! }));
}

/** The trip's destinations as { id, name }, in the trip file's order. */
function destinationList(trip: Trip): Array<{ id: string; name: string }> {
  return Object.entries(trip.info?.destinations ?? {}).map(([id, place]) => ({ id, name: place.name }));
}
