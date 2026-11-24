import { Notice } from "../components/Notice";
import { monthYear } from "../lib/format";
import { useTrip } from "../lib/useTrip";
import type { Trip } from "../types/trip";
import { datesSettled, stage, type Stage } from "./lib/stage";
import "./TripPage.css";

/** The mock's title for each leading block (screens 2, 4, 7 and 9). */
const TITLES: Record<Stage, string> = {
  dates: "Which dates work?",
  stay: "Where do we stay?",
  parties: "Who's playing",
  allSet: "All set",
};

/**
 * The trip page: the header line, the pinned lines of settled blocks, the
 * block that leads, and a "next" row for each later block. The blocks are
 * placeholders here; each one's own ticket fills it in.
 *
 * Inputs: tripId — from the address bar.
 * Output: the page, or one notice when the trip cannot be shown.
 * Examples (checked on the emulator at 390 px):
 *   a new trip      → "Bali · Koh Phangan · Feb 2027", "Which dates work?", a Parties "next" row
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
  const memberId = trip.crew?.devices?.[uid] ?? null;
  const leading = stage(trip, memberId);
  const info = trip.info;

  return (
    <>
      {info && (
        <p className="cap headline">
          {info.name} · {monthYear(info.season.from)}
        </p>
      )}
      {offline && <Notice>No connection</Notice>}
      <section aria-labelledby="lead-title">
        <h1 id="lead-title" className="h1 lead">
          {TITLES[leading]}
        </h1>
      </section>
      <NextRows trip={trip} leading={leading} />
    </>
  );
}

/**
 * The "next" rows under the leading block. Stay has no row until the dates
 * are settled (exception 9); Parties has one from the start.
 */
function NextRows({ trip, leading }: { trip: Trip; leading: Stage }) {
  const stayCount = Object.keys(trip.stay?.options ?? {}).length;
  const showCount = Object.keys(trip.parties?.shows ?? {}).length;
  const rows: Array<{ name: string; count: string }> = [];
  if (leading === "dates" || leading === "stay") {
    if (leading === "dates" && datesSettled(trip)) rows.push({ name: "Stay", count: `${stayCount} options` });
    rows.push({ name: "Parties", count: `${showCount} shows` });
  }
  if (rows.length === 0) return null;
  return (
    <div className="next-rows">
      {rows.map((row) => (
        <div className="row next" key={row.name}>
          <span>
            <b>{row.name}</b> · {row.count}
          </span>
          <span className="cap">next</span>
        </div>
      ))}
    </div>
  );
}
