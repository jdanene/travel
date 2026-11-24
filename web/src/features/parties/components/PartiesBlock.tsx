import { useState } from "react";
import { Icon } from "../../../components/Icon";
import { Notice } from "../../../components/Notice";
import type { WriteResult } from "../../../lib/db";
import type { MemberId, Trip } from "../../../types/trip";
import { addShow, editShow, removeShow, setIn, type PartyDraft } from "../api/parties";
import { lastYearLines } from "../lib/lastYear";
import { byPlaceVenueDate, venueKey, type ListedShow } from "../lib/shows";
import { AddPartySheet } from "./AddPartySheet";
import { LastYearLine } from "./LastYearLine";
import { ShowRow } from "./ShowRow";
import "./Parties.css";

/** The rules' range, used when the trip has no season yet (case 9). */
const DEFAULT_SEASON = { from: "2027-02-01", to: "2027-03-31" };

type SheetState = { mode: "add" } | { mode: "edit"; id: string } | null;

interface PartiesBlockProps {
  tripId: string;
  trip: Trip;
  /** This device's member; null before a reply, and then nothing can be tapped. */
  memberId: MemberId | null;
  isOrganizer: boolean;
  /** Opens the Map module, for "See on the map ›" (12/5). */
  onSeeMap?: () => void;
}

/**
 * The Parties module, opened in place (12/5) with the content of screen
 * 20/7: "Who's playing", then each destination, each venue, and its shows
 * by date, with the last-year line where a weekend is empty. Open from the
 * start; it never waits on the dates.
 *
 * Inputs: the trip id, the trip from the one listener, this device's
 * member and organizer mark, and a way to open the map.
 * Output: the list and the Add a party sheet. With no shows at all, "Nothing
 * announced yet." and the Add button. A refused or failed write shows one
 * notice above the list; the listener already put the data back.
 * Examples (checked on the emulator at 390 px):
 *   the seeded trip  → Bali: Savaya with the Sat 6 – Sun 7 Feb line before Peggy Gou; Koh Phangan: four venues
 *   tap "I'm in"     → filled at once, "1 in" with your initials
 *   add a listed party → the sheet closes and that row scrolls into view
 */
export function PartiesBlock({ tripId, trip, memberId, isOrganizer, onSeeMap }: PartiesBlockProps) {
  const [sheet, setSheet] = useState<SheetState>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const viewer = { memberId, isOrganizer };
  const shows = trip.parties?.shows ?? {};
  const marks = trip.parties?.in ?? {};
  const members = trip.crew?.members ?? {};
  const season = trip.info?.season ?? DEFAULT_SEASON;
  const destinationNames = trip.info?.destinations ?? {};
  const nameOf = (id: string) => destinationNames[id]?.name ?? id;

  const groups = byPlaceVenueDate(shows);
  const lines = lastYearLines(Object.values(shows), Object.values(trip.parties?.lastYear ?? {}), season);
  const editing = sheet?.mode === "edit" ? shows[sheet.id] : undefined;

  const report = (result: WriteResult) => {
    if (result.ok) return;
    setProblem(result.reason === "refused" ? "Only the friend who added it, or the organizer, can change it." : "No connection");
  };
  const run = (pending: Promise<WriteResult>) => {
    setProblem(null);
    void pending.then(report);
  };

  const showRow = (id: string) => {
    setSheet(null);
    requestAnimationFrame(() => {
      const row = document.getElementById(`show-${id}`);
      row?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      row?.focus({ preventScroll: true });
    });
  };

  const save = (draft: PartyDraft) => {
    if (!viewer.memberId) return;
    if (sheet?.mode === "edit" && editing) {
      setSheet(null);
      return run(editShow(tripId, sheet.id, editing, draft));
    }
    setProblem(null);
    void addShow(tripId, trip, draft, viewer.memberId).then((result) => {
      if (!result.ok && result.reason === "listed") return showRow(result.id);
      report(result);
    });
    setSheet(null);
  };

  const venues: Record<string, string[]> = {};
  for (const group of groups) venues[group.destination] = group.venues.map((venue) => venue.name);

  const destinations = Object.entries(destinationNames).map(([id, { name }]) => ({ id, name }));
  const canAdd = viewer.memberId !== null && destinations.length > 0;

  return (
    <div className="parties">
      {problem && <Notice>{problem}</Notice>}
      <div className="parties-top">
        <h2 className="h3">Who's playing</h2>
        {canAdd && (
          <button type="button" className="parties-add" onClick={() => setSheet({ mode: "add" })}>
            <Icon name="plus" />
            Add
          </button>
        )}
      </div>
      {groups.length === 0 && <p className="sub parties-empty">Nothing announced yet.</p>}
      {groups.map(({ destination, venues: venueGroups }) => (
        <section key={destination} aria-labelledby={`place-${destination}`}>
          <h3 className="place" id={`place-${destination}`}>
            {nameOf(destination)}
          </h3>
          {venueGroups.map((venue) => {
            const area = venue.area && venue.area !== nameOf(destination) && !venue.name.toLowerCase().includes(venue.area.toLowerCase()) ? venue.area : null;
            const venueLines = lines.filter((line) => venueKey(line.destination, line.venue) === venue.key);
            const items = [
              ...venueLines.map((line) => ({ date: line.from, line, show: null as ListedShow | null })),
              ...venue.shows.map((show) => ({ date: show.date, line: null, show })),
            ].sort((a, b) => a.date.localeCompare(b.date));
            return (
              <div key={venue.key}>
                <h4 className="venue">
                  <b>{venue.name}</b>
                  {area && <span className="sub"> · {area}</span>}
                </h4>
                {items.map(({ line, show }) =>
                  line ? (
                    <LastYearLine key={`line-${line.from}`} line={line} />
                  ) : (
                    show && (
                      <ShowRow
                        key={show.id}
                        show={show}
                        going={Object.keys(marks[show.id] ?? {})
                          .sort((a, b) => (members[a]?.at ?? 0) - (members[b]?.at ?? 0))
                          .map((id) => ({ id, name: members[id]?.name ?? id }))}
                        you={viewer.memberId}
                        addedByName={show.addedBy ? (members[show.addedBy]?.name ?? show.addedBy) : undefined}
                        canEdit={viewer.isOrganizer || (viewer.memberId !== null && show.addedBy === viewer.memberId)}
                        onIn={(isIn) => viewer.memberId && run(setIn(tripId, show.id, viewer.memberId, isIn))}
                        onEdit={() => setSheet({ mode: "edit", id: show.id })}
                      />
                    )
                  ),
                )}
              </div>
            );
          })}
        </section>
      ))}
      {onSeeMap && groups.length > 0 && (
        <button type="button" className="cap see-map" onClick={onSeeMap}>
          See on the map ›
        </button>
      )}
      <AddPartySheet
        open={sheet !== null && (sheet.mode === "add" || editing !== undefined)}
        editing={editing}
        destinations={destinations}
        venues={venues}
        season={season}
        yourName={viewer.memberId ? (members[viewer.memberId]?.name ?? viewer.memberId) : ""}
        onClose={() => setSheet(null)}
        onSave={save}
        onRemove={() => {
          if (sheet?.mode !== "edit") return;
          setSheet(null);
          run(removeShow(tripId, sheet.id));
        }}
      />
    </div>
  );
}
