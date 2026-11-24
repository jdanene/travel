import type { ReactNode } from "react";
import { Notice } from "../components/Notice";
import { monthYear } from "../lib/format";
import { useTrip } from "../lib/useTrip";
import type { Trip } from "../types/trip";
import { stage } from "./lib/stage";
import "./TripPage.css";

/**
 * The trip page: the header line, then Dates, Stay and Parties as open
 * sections of equal weight (exception 10). The stage decides only what
 * shows: Stay waits for the dates, a settled section shrinks to its pinned
 * line, and "All set" adds the summary. The sections are placeholders here;
 * each one's own ticket fills it in.
 *
 * Inputs: tripId — from the address bar.
 * Output: the page, or one notice when the trip cannot be shown.
 * Examples (checked on the emulator at 390 px):
 *   a new trip      → "Bali · Koh Phangan · Feb 2027", "Which dates work?", then "Who's playing"
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

function ReadyPage({ trip, offline }: { trip: Trip; uid: string; offline: boolean }) {
  const now = stage(trip);
  const info = trip.info;

  return (
    <>
      {info && (
        <h1 className="cap headline">
          {info.name} · {monthYear(info.season.from)}
        </h1>
      )}
      {offline && <Notice>No connection</Notice>}
      {now === "allSet" && <Section id="all-set" title="All set" />}
      {now === "dates" && <Section id="dates" title="Which dates work?" />}
      {now === "plan" && <Section id="stay" title="Where do we stay?" />}
      <Section id="parties" title="Who's playing" />
    </>
  );
}

/** One open section: a heading in the mock's screen-2 size, then its block. */
function Section({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <section className="section" id={id} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="h1 section-title">
        {title}
      </h2>
      {children}
    </section>
  );
}
