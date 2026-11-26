import { useEffect, useState } from "react";
import type { Person } from "../../../components/Avatars";
import { Icon } from "../../../components/Icon";
import { Notice } from "../../../components/Notice";
import type { WriteResult } from "../../../lib/db";
import { idFromName } from "../../../lib/ids";
import { placeName } from "../../../lib/place";
import { eventsLink } from "../../../lib/share";
import type { DestinationId, MemberId, Trip } from "../../../types/trip";
import { addShow, editShow, removeShow, makeTag, setIn, setShowTag, type PartyDraft } from "../api/parties";
import { byTagName, eventShown, eventsList, tagChips, tripTags, type EventsFilter } from "../lib/tags";
import { countryChips, inCountry } from "../lib/countries";
import { clubOf } from "../lib/club";
import { areaShown, placeOf, showPlace, type MapPlace } from "../lib/detail";
import { lastSeason, lastYearLines } from "../lib/lastYear";
import { EVENTS_WINDOW } from "../lib/window";
import { byPlaceVenueDate, venueKey, type KnownVenue, type ListedShow } from "../lib/shows";
import { AddPartySheet } from "./AddPartySheet";
import { ClubSheet } from "./ClubSheet";
import { CountryChips, EventsFilterChips, useEventsCountry } from "./EventsFilter";
import { LastSeason, LastYearLine } from "./LastYearLine";
import { ShareButton } from "./ShareButton";
import { ShowRow } from "./ShowRow";
import { ShowSheet } from "./ShowSheet";
import { VenueIcon } from "./VenueIcon";
import type { VenueSpot } from "../lib/venues";
import "./Parties.css";

type SheetState = { mode: "add" } | { mode: "edit"; id: string } | null;

interface PartiesBlockProps {
  tripId: string;
  trip: Trip;
  /** This device's member; null on the shared events page: nothing writes and no crew shows. */
  memberId: MemberId | null;
  isOrganizer: boolean;
  /** Opens the Map module: on one place from the show sheet, or as it was from "See on the map ›" (12/5). */
  onSeeMap?: (place?: MapPlace) => void;
  /** The Events filter, shared with the map: a tag's slug or "all" (useEventsFilter). */
  filter: EventsFilter;
  onFilter: (next: EventsFilter) => void;
  /** On the shared events page: each event's own page, which its row links to instead of opening the sheet. */
  eventHref?: (showId: string) => string;
}

/**
 * The Events module (code: parties), opened in place (12/5) with the
 * content of screen 20/7: "Who's playing", then each destination named with its country ("Bali, Indonesia"),
 * every venue the trip knows with its picture as its icon when it has one, and its shows (weekly
 * ones first, then by date), with the last-year line where a weekend is
 * empty and "Last season:" under a venue with nothing announced. Open from
 * the start; it never waits on the dates. A tap on a show opens its sheet.
 * In the app a tap on a pinned club's heading opens the Map on it
 * (exception 30); on the shared page, which has no map, a tap on any
 * venue's heading opens its club sheet (ClubSheet, exception 37).
 * At the top, one chip per tag the trip has ("Big nights" first), "All · 27"
 * and, for a member, "+" to make a new tag: by default the list holds the
 * events tagged Big nights, the big venues with nothing announced, and
 * every friend's event (lib/tags.ts); the device remembers the choice. A
 * tag with nothing under it says "No events tagged yet. Open an event to
 * add it." Each row shows its other tags as grey labels; any member puts
 * the trip's tags on an event or takes them off in its show sheet. Above
 * the tags, with two countries or more, "All countries" and one chip per
 * country (lib/countries.ts); a country and a tag combine, "All · N" counts
 * the events in the picked country, and the device remembers the country.
 * An event saved in another country opens "All countries" so it stays in
 * sight.
 *
 * Beside "+ Add", a member's "Share" hands out the shared events page,
 * /trip/<id>/events (owner, 25 Nov 2026: "share all the events to my
 * friends so they can see it"); each show sheet shares its own event.
 * With no member (that shared page) the same list is read-only: no "+ Add",
 * no "Share", no "+" tag, no tag edits, no "I'm in", and no crew, no
 * faces, counts, names or initials; each row links to its event's page.
 *
 * Inputs: the trip id, the trip from the one listener, this device's
 * member and organizer mark, a way to open the map, and on the shared
 * page each event's address.
 * Output: the list, the show sheet, the club sheet and the Add an event sheet. With no
 * shows and no venues, "Nothing announced yet." and the Add button. A
 * refused or failed write shows one notice above the list; the listener
 * already put the data back. A show removed while its sheet is open closes
 * the sheet with "This event was removed."
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   the seeded trip  → "Big nights" picked; Bali, Indonesia: Savaya with its picture, then Atlas Beach Club … Potato Head with nothing announced; Koh Phangan: Haad Rin Beach with the Full Moon Party
 *   tap "All · 27"   → Bali: Mrs Sippy … Savaya, then the venues with nothing announced; Koh Phangan: Eden Garden, Half Moon Festival, … Haad Rin Beach
 *   tap "Peggy Gou"  → the show sheet; its place row opens the Map on Savaya with its card open
 *   the "See on the map" row under the list (the event sheet's map row: mark, words, chevron) → the Map with every place
 *   an event you added, its sheet's "Edit" → the edit sheet in place of the show sheet; Cancel or Save brings the show sheet back; Remove does not
 *   tap "Savaya" in the app → the Map opens on Savaya with its card open; a club with no pin has a plain heading
 *   tap "Savaya" on the shared page → its club sheet: picture, "Uluwatu, Bali, Indonesia", "Website", "Instagram", "Google Maps"
 *   tap "I'm in"     → filled at once, "1 in" with your initials, on the row and in the sheet
 *   any member, Peggy Gou's sheet, remove Big nights → Peggy Gou leaves the default list; Savaya with it when it has no other Big nights event
 *   tap "Share" on a desktop → "Copied"; the clipboard holds <origin>/trip/<id>/events
 *   memberId null    → the same groups and chips; no Add, Share, "+", "I'm in", faces or counts; a row opens /trip/<id>/events/<showId>
 *   tap "Thailand", then "Big nights" → only Koh Phangan, Thailand and Phuket, Thailand, with their Big nights; "All · N" counts Thailand's events
 */
export function PartiesBlock({ tripId, trip, memberId, isOrganizer, onSeeMap, filter, onFilter: setFilter, eventHref }: PartiesBlockProps) {
  const [sheet, setSheet] = useState<SheetState>(null);
  const [detail, setDetail] = useState<string | null>(null);
  // The show whose sheet opened the edit sheet: closing or saving the edit brings that sheet back.
  const [editFrom, setEditFrom] = useState<string | null>(null);
  // The venue heading whose club sheet is open.
  const [clubAt, setClubAt] = useState<{ destination: DestinationId; name: string; area?: string } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // The row a friend's "Add" found already listed; scrolled to once it is drawn.
  const [rowToShow, setRowToShow] = useState<string | null>(null);
  const viewer = { memberId, isOrganizer };
  const shows = trip.parties?.shows ?? {};
  const marks = trip.parties?.in ?? {};
  const members = trip.crew?.members ?? {};
  const destinationNames = trip.info?.destinations ?? {};
  // Every place is named with its country: "Bali, Indonesia" (owner, 24 Nov 2026).
  const nameOf = (id: string) => (destinationNames[id] ? placeName(destinationNames[id].name, destinationNames[id].country) : id);
  const photoOf = new Map(Object.values(trip.places?.venues ?? {}).map((venue) => [venueKey(venue.destination, venue.name), venue.photoUrl]));
  const areas = trip.places?.areas ?? {};
  const lastYear = Object.values(trip.parties?.lastYear ?? {});

  const known: KnownVenue[] = Object.values(trip.places?.venues ?? {}).map((venue) => ({
    name: venue.name,
    destination: venue.destination,
    area: venue.areaId ? areas[venue.areaId]?.name : undefined,
  }));
  const tags = tripTags(trip);
  const chips = tagChips(tags);
  const countries = countryChips(destinationNames, [...Object.values(shows), ...known]);
  const [country, setCountry] = useEventsCountry(countries);
  const here = (destination: string) => inCountry(country, destinationNames, destination);
  // The country and the tag combine: Thailand and Big nights list the Big nights in Thailand.
  const withShows = new Set(Object.values(shows).map((show) => venueKey(show.destination, show.venue)));
  const groups = eventsList(shows, known, filter, tags).filter((group) => here(group.destination));
  // A row the friend just added or edited stays in sight: another country than the picked one opens "All countries".
  const keepInSight = (destination: string) => !here(destination) && setCountry("all");
  // A last-year line shows inside its venue, so it follows the venue in or out of the list.
  const lines = lastYearLines(Object.values(shows), lastYear, EVENTS_WINDOW);
  const tagsOf = (id: string) => [...(tags.byShow[id] ?? [])];
  // The row's grey labels: the event's tags but the picked one, Big nights first, then by name.
  const rowTags = (id: string) =>
    tagsOf(id)
      .filter((tag) => tag !== filter)
      .sort(byTagName(tags.names))
      .map((tag) => tags.names[tag] ?? tag);
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

  // The shared page shows no crew: nobody's marks or name ever reach its rows.
  const going = (id: string): Person[] =>
    Object.keys(viewer.memberId === null ? {} : (marks[id] ?? {}))
      .sort((a, b) => (members[a]?.at ?? 0) - (members[b]?.at ?? 0))
      .map((member) => ({ id: member, name: members[member]?.name ?? member }));
  const adderOf = (show: ListedShow) => (show.addedBy && viewer.memberId !== null ? (members[show.addedBy]?.name ?? show.addedBy) : undefined);
  const setInFor = (id: string) => (isIn: boolean) => viewer.memberId && run(setIn(tripId, id, trip.parties?.shows?.[id], viewer.memberId, isIn));

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
    if (shows[id] && !eventShown(filter, id, shows[id], tags)) setFilter("all");
    if (shows[id]) keepInSight(shows[id].destination);
    setRowToShow(id);
  };

  const save = (draft: PartyDraft) => {
    if (!viewer.memberId) return;
    keepInSight(draft.destination);
    if (sheet?.mode === "edit" && editing) {
      setSheet(null);
      backToSheet();
      return run(editShow(tripId, trip, sheet.id, editing, draft, viewer.memberId));
    }
    setProblem(null);
    void addShow(tripId, trip, draft, viewer.memberId).then((result) => {
      if (!result.ok && result.reason === "listed") return showRow(result.id);
      report(result);
    });
    setSheet(null);
  };

  // Back to the event's sheet after its edit sheet closes; nothing when the edit began elsewhere.
  const backToSheet = () => {
    if (editFrom) setDetail(editFrom);
    setEditFrom(null);
  };
  const mayEdit = (show: ListedShow) => viewer.isOrganizer || (viewer.memberId !== null && show.addedBy === viewer.memberId);

  const destinations = Object.entries(destinationNames).map(([id, { lat, lng }]) => ({ id, name: nameOf(id), lat, lng }));
  const canAdd = viewer.memberId !== null && destinations.length > 0;
  // The map pins every venue with an event this season, whatever the filter (app/lib/pins.ts), so an event's venue is on it.
  const openedPlace = opened ? placeOf(opened, trip.places) : null;
  const openedWhere = opened ? showPlace(opened, trip) : null;
  const tripName = trip.info?.name ?? "";

  return (
    <div className="parties">
      {problem && <Notice>{problem}</Notice>}
      <div className="parties-top">
        <h2 className="h3">Who's playing</h2>
        {viewer.memberId !== null && (
          <div className="parties-acts">
            <ShareButton url={eventsLink(window.location.origin, tripId)} text={tripName} className="parties-share" />
            {canAdd && (
              <button type="button" className="parties-add" onClick={() => setSheet({ mode: "add" })}>
                <Icon name="plus" />
                Add
              </button>
            )}
          </div>
        )}
      </div>
      <CountryChips country={country} countries={countries} onChoose={setCountry} />
      {(chips.length > 0 || viewer.memberId !== null) && (
        <EventsFilterChips
          filter={filter}
          chips={chips}
          total={Object.values(shows).filter((show) => here(show.destination)).length}
          onChoose={setFilter}
          onMake={viewer.memberId !== null ? (tag, name) => makeTag(tripId, tag, name) : undefined}
        />
      )}
      {groups.length === 0 && (
        <p className="sub parties-empty">
          {filter === "all"
            ? "Nothing announced yet."
            : `No events tagged yet${country === "all" ? "" : ` in ${country}`}.${viewer.memberId === null ? "" : " Open an event to add it."}`}
        </p>
      )}
      {groups.map(({ destination, venues: venueGroups }) => (
        <section key={destination} aria-labelledby={`place-${destination}`}>
          <h3 className="place" id={`place-${destination}`}>
            {nameOf(destination)}
          </h3>
          {venueGroups.map((venue) => {
            const area = areaShown(venue.name, venue.area, nameOf(destination));
            const place = placeOf({ destination, venue: venue.name }, trip.places);
            // The map pins a major club, or a venue with an event this season (app/lib/pins.ts); only those open it.
            const pinned = place?.kind === "venue" && (trip.places?.venues?.[place.id]?.big === true || withShows.has(venue.key));
            const line = place?.line;
            const venueLines = lines.filter((one) => venueKey(one.destination, one.venue) === venue.key);
            const items = [
              ...venueLines.map((one) => ({ date: one.from, line: one, show: null as ListedShow | null })),
              ...venue.shows.map((show) => ({ date: show.weekly ? "" : show.date, line: null, show })),
            ].sort((a, b) => a.date.localeCompare(b.date));
            return (
              <div key={venue.key} className="venue-group">
                <h4 className="venue">
                  {onSeeMap ? (
                    // In the app a tap on a club opens the map on its pin, among the other places (owner, 25 Nov 2026; exception 30).
                    place && pinned ? (
                      <button type="button" className="venue-go" onClick={() => onSeeMap(place)} aria-label={`${venue.name}, show on the map`}>
                        <VenueHead icon={photoOf.get(venue.key)} name={venue.name} area={area} line={line} />
                        {/* The same mark as the event sheet's place row: both open our Map (owner, 25 Nov 2026: "be consistent"). */}
                        <span className="venue-pin" aria-hidden="true">
                          <Icon name="map" size={18} />
                        </span>
                      </button>
                    ) : (
                      <VenueHead icon={photoOf.get(venue.key)} name={venue.name} area={area} line={line} />
                    )
                  ) : (
                    // The shared page has no map: a tap on a club opens its sheet, with its picture, website, Instagram and Google Maps (exception 37). No icon marks it (owner, 25 Nov 2026: "remove the info icon from the clubs").
                    <button
                      type="button"
                      className="venue-go"
                      aria-haspopup="dialog"
                      aria-label={`${venue.name}, about this club`}
                      onClick={() => setClubAt({ destination, name: venue.name, ...(venue.area ? { area: venue.area } : {}) })}
                    >
                      <VenueHead icon={photoOf.get(venue.key)} name={venue.name} area={area} line={line} />
                    </button>
                  )}
                </h4>
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
                        tags={rowTags(show.id)}
                        onIn={setInFor(show.id)}
                        onOpen={() => setDetail(show.id)}
                        href={eventHref?.(show.id)}
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
        // The way an event's sheet goes to our map (owner, 26 Nov 2026: "the way events get to map is better than having a
        // button that says see on map"): the Map's mark, the words, a chevron, the whole row the target.
        <button type="button" className="show-where show-where-go see-map" onClick={() => onSeeMap()}>
          <Icon name="map" size={20} />
          <span className="show-where-text">See on the map</span>
          <Icon name="chev" size={18} />
        </button>
      )}
      <ShowSheet
        show={opened}
        where={openedWhere?.where ?? ""}
        venueLine={openedWhere?.line}
        venuePhoto={openedWhere?.photoUrl}
        going={opened ? going(opened.id) : []}
        you={viewer.memberId}
        addedByName={opened ? adderOf(opened) : undefined}
        onIn={(isIn) => (opened && viewer.memberId ? setIn(tripId, opened.id, trip.parties?.shows?.[opened.id], viewer.memberId, isIn) : Promise.resolve({ ok: true as const }))}
        onSeeMap={
          onSeeMap && openedPlace
            ? () => {
                setDetail(null);
                onSeeMap(openedPlace);
              }
            : undefined
        }
        tags={opened ? tagsOf(opened.id) : []}
        tagNames={tags.names}
        onTag={viewer.memberId && opened ? (tag, on) => setShowTag(tripId, opened.id, tag, on) : undefined}
        share={viewer.memberId && opened ? { url: eventsLink(window.location.origin, tripId, opened.id), text: `${opened.artist} · ${tripName}` } : undefined}
        onEdit={
          opened && mayEdit(opened)
            ? () => {
                // One sheet at a time: this one closes and the edit sheet opens in its place.
                setDetail(null);
                setEditFrom(opened.id);
                setSheet({ mode: "edit", id: opened.id });
              }
            : undefined
        }
        onClose={() => setDetail(null)}
      />
      <ClubSheet club={clubAt ? clubOf(clubAt, trip) : undefined} onClose={() => setClubAt(null)} />
      <AddPartySheet
        open={sheet !== null && (sheet.mode === "add" || editing !== undefined)}
        editing={editing}
        destinations={destinations}
        venues={knownVenues(trip, byPlaceVenueDate(shows, known))}
        startMonth={trip.info?.season?.from?.slice(0, 7)}
        yourName={viewer.memberId ? (members[viewer.memberId]?.name ?? viewer.memberId) : ""}
        onClose={() => {
          setSheet(null);
          backToSheet();
        }}
        onSave={save}
        onRemove={() => {
          if (sheet?.mode !== "edit") return;
          setSheet(null);
          setEditFrom(null);
          run(removeShow(tripId, sheet.id));
        }}
      />
    </div>
  );
}

/**
 * The venues Add an event's search offers before anything is typed, in
 * every destination: the trip's clubs (places/venues) first, by
 * destination and name, then the venues friends' events already name and
 * the places friends put on the map (places/custom, which may be missing),
 * by name. Each venue once per destination.
 *
 * Inputs: the trip and the list's groups.
 * Output: the venues, in that order.
 * Examples (checked on screen): Atlas Beach Club … Ulu Cliffhouse (Bali), Eden Garden … (Koh Phangan), then friends' places
 */
function knownVenues(trip: Trip, groups: ReturnType<typeof byPlaceVenueDate>): VenueSpot[] {
  const order = Object.keys(trip.info?.destinations ?? {});
  const byName = (a: VenueSpot, b: VenueSpot) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  const clubs = Object.values(trip.places?.venues ?? {})
    .map((venue): VenueSpot => ({ name: venue.name.trim(), destination: venue.destination, club: true, ...(venue.photoUrl ? { photoUrl: venue.photoUrl } : {}) }))
    .sort((a, b) => order.indexOf(a.destination) - order.indexOf(b.destination) || byName(a, b));
  const custom = Object.values((trip.places as { custom?: Record<string, { name?: unknown; destination?: unknown }> } | undefined)?.custom ?? {});
  const others = [
    ...groups.flatMap((group) => group.venues.map((venue) => ({ destination: group.destination, name: venue.name }))),
    ...custom.flatMap((place) => (typeof place?.name === "string" && typeof place.destination === "string" ? [{ destination: place.destination, name: place.name }] : [])),
  ]
    .map(({ destination, name }): VenueSpot => ({ name: name.trim(), destination, club: false }))
    .sort(byName);
  const seen = new Set<string>();
  return [...clubs, ...others].filter((venue) => {
    const key = `${venue.destination}|${idFromName(venue.name)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * A venue's heading in the Events list: its picture, its name, its area
 * and its one plain line.
 *
 * Inputs: icon — the picture's address, if any; name; area — shown after a
 * dot when it is not the destination; line — "Club on the cliffs", if any.
 * Output: the icon and the words, for a heading or the button inside one.
 * Examples (checked on screen): Savaya → its picture, "Savaya · Uluwatu", "Club on the cliffs"
 */
function VenueHead({ icon, name, area, line }: { icon: string | undefined; name: string; area: string | null | undefined; line: string | undefined }) {
  return (
    <>
      <VenueIcon url={icon} />
      <span className="venue-name">
        <b>{name}</b>
        {area && <span className="sub"> · {area}</span>}
        {line && <span className="venue-line">{line}</span>}
      </span>
    </>
  );
}
