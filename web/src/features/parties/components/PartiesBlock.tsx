import { useEffect, useState } from "react";
import type { Person } from "../../../components/Avatars";
import { Icon } from "../../../components/Icon";
import { Notice } from "../../../components/Notice";
import type { WriteResult } from "../../../lib/db";
import { idFromName } from "../../../lib/ids";
import type { MemberId, Trip } from "../../../types/trip";
import { addShow, editShow, removeShow, setIn, setVenueTag, type PartyDraft } from "../api/parties";
import { eventsList, shownUnder, tagChips, tripTags, type EventsFilter } from "../lib/tags";
import { areaShown, placeLine, placeOf, type MapPlace } from "../lib/detail";
import { lastSeason, lastYearLines } from "../lib/lastYear";
import { byPlaceVenueDate, venueKey, type KnownVenue, type ListedShow } from "../lib/shows";
import { AddPartySheet } from "./AddPartySheet";
import { EventsFilterChips } from "./EventsFilter";
import { LastSeason, LastYearLine } from "./LastYearLine";
import { ShowRow } from "./ShowRow";
import { ShowSheet } from "./ShowSheet";
import { TagsSheet } from "./TagsSheet";
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
  /** Opens the Map module: on one place from the show sheet, or as it was from "See on the map ›" (12/5). */
  onSeeMap?: (place?: MapPlace) => void;
  /** The Events filter, shared with the map: a tag's slug or "all" (useEventsFilter). */
  filter: EventsFilter;
  onFilter: (next: EventsFilter) => void;
}

/**
 * The Events module (code: parties), opened in place (12/5) with the
 * content of screen 20/7: "Who's playing", then each destination, every venue the trip knows, and its shows (weekly
 * ones first, then by date), with the last-year line where a weekend is
 * empty and "Last season:" under a venue with nothing announced. Open from
 * the start; it never waits on the dates. A tap on a show opens its sheet.
 * At the top, one chip per venue tag ("Big nights" first) and "All · 27":
 * by default the list holds the venues tagged Big nights and every
 * friend's event (lib/tags.ts); the device remembers the choice. Without a
 * tagged venue the chips are not drawn. An organizer finds "Tags" beside
 * each venue of the trip, which opens the Tags sheet.
 *
 * Inputs: the trip id, the trip from the one listener, this device's
 * member and organizer mark, and a way to open the map.
 * Output: the list, the show sheet and the Add an event sheet. With no
 * shows and no venues, "Nothing announced yet." and the Add button. A
 * refused or failed write shows one notice above the list; the listener
 * already put the data back. A show removed while its sheet is open closes
 * the sheet with "This event was removed."
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   the seeded trip  → "Big nights" picked; Bali: Savaya, then Atlas Beach Club … Potato Head with nothing announced; Koh Phangan: Haad Rin Beach with the Full Moon Party
 *   tap "All · 27"   → Bali: Mrs Sippy … Savaya, then the venues with nothing announced; Koh Phangan: Eden Garden, Half Moon Festival, … Haad Rin Beach
 *   tap "Peggy Gou"  → the show sheet; "See on the map" opens the Map on Savaya with its card open
 *   tap "I'm in"     → filled at once, "1 in" with your initials, on the row and in the sheet
 *   organizer, "Tags" on Savaya, remove Big nights → Savaya leaves the default list and the map
 */
export function PartiesBlock({ tripId, trip, memberId, isOrganizer, onSeeMap, filter, onFilter: setFilter }: PartiesBlockProps) {
  const [sheet, setSheet] = useState<SheetState>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [tagging, setTagging] = useState<string | null>(null);
  // The row a friend's "Add" found already listed; scrolled to once it is drawn.
  const [rowToShow, setRowToShow] = useState<string | null>(null);
  const viewer = { memberId, isOrganizer };
  const shows = trip.parties?.shows ?? {};
  const marks = trip.parties?.in ?? {};
  const members = trip.crew?.members ?? {};
  const season = trip.info?.season ?? DEFAULT_SEASON;
  const destinationNames = trip.info?.destinations ?? {};
  const nameOf = (id: string) => destinationNames[id]?.name ?? id;
  const areas = trip.places?.areas ?? {};
  const lastYear = Object.values(trip.parties?.lastYear ?? {});

  const known: KnownVenue[] = Object.values(trip.places?.venues ?? {}).map((venue) => ({
    name: venue.name,
    destination: venue.destination,
    area: venue.areaId ? areas[venue.areaId]?.name : undefined,
  }));
  const tags = tripTags(trip.places);
  const chips = tagChips(tags);
  const groups = eventsList(shows, known, filter, tags);
  const lines = lastYearLines(Object.values(shows), lastYear, season).filter((line) => shownUnder(filter, line, tags));
  // The trip's own venues by venueKey(), the ones an organizer can tag.
  const venueIds = new Map(Object.entries(trip.places?.venues ?? {}).map(([id, venue]) => [venueKey(venue.destination, venue.name), id]));
  const taggingVenue = tagging ? trip.places?.venues?.[tagging] : undefined;
  const editing = sheet?.mode === "edit" ? shows[sheet.id] : undefined;
  const opened: ListedShow | undefined = detail && shows[detail] ? { ...shows[detail], id: detail } : undefined;

  // A show removed by its adder while its sheet is open: close the sheet and say why.
  useEffect(() => {
    if (detail && !shows[detail]) {
      setDetail(null);
      setProblem("This event was removed.");
    }
  }, [detail, shows]);

  const report = (result: WriteResult) => {
    if (result.ok) return;
    setProblem(result.reason === "refused" ? "Only the friend who added it, or the organizer, can change it." : "No connection");
  };
  const run = (pending: Promise<WriteResult>) => {
    setProblem(null);
    void pending.then(report);
  };

  const going = (id: string): Person[] =>
    Object.keys(marks[id] ?? {})
      .sort((a, b) => (members[a]?.at ?? 0) - (members[b]?.at ?? 0))
      .map((member) => ({ id: member, name: members[member]?.name ?? member }));
  const adderOf = (show: ListedShow) => (show.addedBy ? (members[show.addedBy]?.name ?? show.addedBy) : undefined);
  const setInFor = (id: string) => (isIn: boolean) => viewer.memberId && run(setIn(tripId, id, viewer.memberId, isIn));
  const areaOf = (show: ListedShow) => show.area ?? areas[placeOf(show, trip.places)?.areaId ?? ""]?.name;

  // After the render that draws the row: under "Big nights" a listed show at another venue first needs "All".
  useEffect(() => {
    if (!rowToShow) return;
    requestAnimationFrame(() => {
      const row = document.getElementById(`show-${rowToShow}`);
      row?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      row?.focus({ preventScroll: true });
    });
    setRowToShow(null);
  }, [rowToShow]);

  const showRow = (id: string) => {
    setSheet(null);
    if (shows[id] && !shownUnder(filter, shows[id], tags)) setFilter("all");
    setRowToShow(id);
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

  const destinations = Object.entries(destinationNames).map(([id, { name }]) => ({ id, name }));
  const canAdd = viewer.memberId !== null && destinations.length > 0;
  // The map draws the filter's venues only (app/lib/pins.ts), so a show at another venue has no pin to open on.
  const found = opened ? placeOf(opened, trip.places) : null;
  const openedPlace =
    opened && found && (found.kind !== "venue" || shownUnder(filter, { destination: opened.destination, venue: opened.venue }, tags)) ? found : null;

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
      {chips.length > 0 && <EventsFilterChips filter={filter} chips={chips} total={Object.keys(shows).length} onChoose={setFilter} />}
      {groups.length === 0 && <p className="sub parties-empty">Nothing announced yet.</p>}
      {groups.map(({ destination, venues: venueGroups }) => (
        <section key={destination} aria-labelledby={`place-${destination}`}>
          <h3 className="place" id={`place-${destination}`}>
            {nameOf(destination)}
          </h3>
          {venueGroups.map((venue) => {
            const area = areaShown(venue.name, venue.area, nameOf(destination));
            const line = placeOf({ destination, venue: venue.name }, trip.places)?.line;
            const venueLines = lines.filter((one) => venueKey(one.destination, one.venue) === venue.key);
            const items = [
              ...venueLines.map((one) => ({ date: one.from, line: one, show: null as ListedShow | null })),
              ...venue.shows.map((show) => ({ date: show.weekly ? "" : show.date, line: null, show })),
            ].sort((a, b) => a.date.localeCompare(b.date));
            const venueId = isOrganizer ? venueIds.get(venue.key) : undefined;
            const heading = (
              <h4 className="venue">
                <b>{venue.name}</b>
                {area && <span className="sub"> · {area}</span>}
                {line && <span className="venue-line">{line}</span>}
              </h4>
            );
            return (
              <div key={venue.key} className="venue-group">
                {venueId ? (
                  <div className="venue-head">
                    {heading}
                    <button type="button" className="venue-tags" aria-label={`Tags for ${venue.name}`} onClick={() => setTagging(venueId)}>
                      Tags
                    </button>
                  </div>
                ) : (
                  heading
                )}
                {venue.shows.length === 0 && <LastSeason shows={lastSeason(destination, venue.name, lastYear)} />}
                {items.map(({ line: weekend, show }) =>
                  weekend ? (
                    <LastYearLine key={`line-${weekend.from}`} line={weekend} />
                  ) : (
                    show && (
                      <ShowRow
                        key={show.id}
                        show={show}
                        going={going(show.id)}
                        you={viewer.memberId}
                        addedByName={adderOf(show)}
                        canEdit={viewer.isOrganizer || (viewer.memberId !== null && show.addedBy === viewer.memberId)}
                        onIn={setInFor(show.id)}
                        onEdit={() => setSheet({ mode: "edit", id: show.id })}
                        onOpen={() => setDetail(show.id)}
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
        <button type="button" className="cap see-map" onClick={() => onSeeMap()}>
          See on the map ›
        </button>
      )}
      <ShowSheet
        show={opened}
        where={opened ? placeLine(opened.venue, areaOf(opened), nameOf(opened.destination)) : ""}
        venueLine={openedPlace?.line}
        going={opened ? going(opened.id) : []}
        you={viewer.memberId}
        addedByName={opened ? adderOf(opened) : undefined}
        onIn={opened ? setInFor(opened.id) : () => undefined}
        onSeeMap={
          onSeeMap && openedPlace
            ? () => {
                setDetail(null);
                onSeeMap(openedPlace);
              }
            : undefined
        }
        onClose={() => setDetail(null)}
      />
      <TagsSheet
        venue={taggingVenue ? { name: taggingVenue.name, tags: [...(tags.byVenue.get(venueKey(taggingVenue.destination, taggingVenue.name)) ?? [])] } : null}
        names={tags.names}
        onChange={(tag, on, newName) => setVenueTag(tripId, tagging!, tag, on, newName)}
        onClose={() => setTagging(null)}
      />
      <AddPartySheet
        open={sheet !== null && (sheet.mode === "add" || editing !== undefined)}
        editing={editing}
        destinations={destinations}
        venues={venuesByDestination(trip, byPlaceVenueDate(shows, known))}
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

/**
 * The names Add an event offers for "Venue", per destination: the trip's
 * venues, the venues friends' events already name, and the places friends
 * put on the map (places/custom, which may be missing), each name once,
 * by name.
 *
 * Inputs: the trip and the list's groups.
 * Output: { destinationId: names }.
 * Examples (checked on screen): Bali → "Atlas Beach Club", …, "Single Fin", "Ulu Cliffhouse"
 */
function venuesByDestination(trip: Trip, groups: ReturnType<typeof byPlaceVenueDate>): Record<string, string[]> {
  const custom = Object.values((trip.places as { custom?: Record<string, { name?: unknown; destination?: unknown }> } | undefined)?.custom ?? {});
  const all = [
    ...Object.values(trip.places?.venues ?? {}).map((venue) => ({ destination: venue.destination, name: venue.name })),
    ...groups.flatMap((group) => group.venues.map((venue) => ({ destination: group.destination, name: venue.name }))),
    ...custom.flatMap((place) => (typeof place?.name === "string" && typeof place.destination === "string" ? [{ destination: place.destination, name: place.name }] : [])),
  ];
  const byDestination: Record<string, Map<string, string>> = {};
  for (const { destination, name } of all) {
    const names = (byDestination[destination] ??= new Map());
    if (!names.has(idFromName(name))) names.set(idFromName(name), name.trim());
  }
  return Object.fromEntries(
    Object.entries(byDestination).map(([destination, names]) => [destination, [...names.values()].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))]),
  );
}
