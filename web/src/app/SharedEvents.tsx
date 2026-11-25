import { FlyerTitle } from "../components/FlyerHead";
import { Notice } from "../components/Notice";
import { useEventsFilter } from "../features/parties/components/EventsFilter";
import { EventPage } from "../features/parties/components/EventPage";
import { PartiesBlock } from "../features/parties/components/PartiesBlock";
import { tagChips, tripTags } from "../features/parties/lib/tags";
import { eventsLink } from "../lib/share";
import { useTrip } from "../lib/useTrip";
import type { Trip } from "../types/trip";
import { JoinNudge } from "./JoinNudge";
import { nudgeFor } from "./lib/nudge";
import "./SharedEvents.css";

/**
 * The shared events pages (owner, 25 Nov 2026: "share the events stand
 * alone", "the same list as the app", "the same styling as the app", "a
 * single event"; layouts A1 and S1): the trip's title, then every event as
 * the app lists it, or one event; and the join bar at the foot. They open
 * straight from a link, with no splash, for anyone the link reaches, so
 * nothing on them writes and no friend's face, name, initials or count per
 * event shows. The device signs in anonymously only to read the trip.
 *
 * Inputs: tripId; showId — one event, or none for every event.
 * Output: the page, or one notice when the trip cannot be shown.
 * Examples (checked on the emulator at 390 px and 1650 px):
 *   /trip/<id>/events          → the title, the chips, the list, "You're invited" and "Join the trip"
 *   /trip/<id>/events/<showId> → the title, the event's card and facts, "See all 12 events", the bar
 *   /trip/wrong/events         → "This link does not open a trip. Ask the organizer for the link."
 *   emulator down              → "No connection" after 5 seconds
 */
export function SharedEvents({ tripId, showId }: { tripId: string; showId?: string }) {
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
      return (
        <div className="shared">
          {state.offline && <Notice>No connection</Notice>}
          <header className="shared-head">{state.trip.info && <FlyerTitle info={state.trip.info} />}</header>
          {showId === undefined ? (
            <EveryEvent tripId={tripId} trip={state.trip} />
          ) : (
            <EventPage trip={state.trip} showId={showId} allHref={eventsLink("", tripId)} />
          )}
          <JoinNudge tripId={tripId} nudge={nudgeFor(state.trip.crew, state.uid)} />
        </div>
      );
  }
}

/**
 * Every event, in the Events module's own card and list, read-only: the
 * list draws with no member, and each row links to its event's page. The
 * filters start at the defaults on every visit (EventsFilter.tsx).
 *
 * Inputs: tripId, trip.
 * Output: the card with the list.
 * Examples (checked on the emulator): "Big nights" picked, Bali, Indonesia first; tap Peggy Gou → /trip/<id>/events/<showId>
 */
function EveryEvent({ tripId, trip }: { tripId: string; trip: Trip }) {
  const [filter, setFilter] = useEventsFilter(tagChips(tripTags(trip)));
  return (
    <section className="fb shared-list" aria-label="Events">
      <div className="fb-body">
        <PartiesBlock
          tripId={tripId}
          trip={trip}
          memberId={null}
          isOrganizer={false}
          filter={filter}
          onFilter={setFilter}
          eventHref={(id) => eventsLink("", tripId, id)}
        />
      </div>
    </section>
  );
}
