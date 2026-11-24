import { placeWord } from "../../features/map/lib/places";
import { shownUnder, tripTags, type EventsFilter } from "../../features/parties/lib/tags";
import { idFromName } from "../../lib/ids";
import { initials } from "../../lib/initials";
import { weekdayDate } from "../../lib/format";
import type { Pin } from "../../types/pin";
import type { Trip } from "../../types/trip";
import { datesSettled } from "./modules";

/**
 * Every pin of the trip's map in one list: the stay options and the party
 * venues. It lives in app/ because it joins stay, parties and places; the
 * map feature only draws what it is given.
 *
 * Stay pins: one per stay option, at the centre of its area, because a
 * listing gives no exact position (D10); an unknown area puts the pin at
 * the destination's centre (case 33). None while the dates are not
 * confirmed (exception 3). Trip 9 adds the Stay module that a stay card opens.
 * Venue pins: one per venue of places/venues that the Events filter shows:
 * the venues with the picked tag ("Big nights" by default), or every
 * venue under "All" (owner, 24 Nov 2026).
 * A friend's party at another venue gets no pin (case 34); its row still
 * shows in Events.
 *
 * Friends' places: one per entry in places/custom ("Add to map"), where
 * the friend put it, with its kind's icon, its link and who added it.
 *
 * Inputs: trip — the whole trip; filter — the Events filter, a tag or "all".
 * Output: the pins, stays first, then venues, then friends' places. A venue's card line is its own line (or
 * its area) and its next show this year; with no show, the area alone.
 * Examples (checked on the emulator):
 *   the seeded trip, dates open, "big" → seven venue pins (the Big nights venues), no stay pins
 *   Savaya with a show on 13 Feb → line "Club on the cliffs · next show Sat 13 Feb"
 *   Kai adds "Sunset bar", Food   → a place pin, line "Food · added by KA"
 */
export function pins(trip: Trip, filter: EventsFilter): Pin[] {
  const areas = trip.places?.areas ?? {};
  const venues = trip.places?.venues ?? {};
  const destinations = trip.info?.destinations ?? {};

  const stays: Pin[] = [];
  if (datesSettled(trip)) {
    for (const [stayId, option] of Object.entries(trip.stay?.options ?? {})) {
      const area = Object.values(areas).find((candidate) => idFromName(candidate.name) === idFromName(option.area));
      const centre = area ?? destinations[option.destination];
      if (centre?.lat === undefined || centre.lng === undefined) continue;
      const facts = [option.area, option.sleeps ? `sleeps ${option.sleeps}` : null].filter(Boolean).join(" · ");
      stays.push({ id: `stay:${stayId}`, kind: "stay", destination: option.destination, name: option.name, lat: centre.lat, lng: centre.lng, line: facts });
    }
  }

  const nextShow = new Map<string, string>();
  for (const show of Object.values(trip.parties?.shows ?? {})) {
    const id = idFromName(show.venue);
    if (!nextShow.has(id) || show.date < nextShow.get(id)!) nextShow.set(id, show.date);
  }

  const tags = tripTags(trip.places);
  const shown = Object.entries(venues).filter(([, venue]) => shownUnder(filter, { destination: venue.destination, venue: venue.name }, tags));
  const places: Pin[] = shown.map(([venueId, venue]) => {
    const where = venue.line ?? (venue.areaId ? areas[venue.areaId]?.name : undefined) ?? destinations[venue.destination]?.name ?? "";
    const next = nextShow.get(venueId);
    return {
      id: `venue:${venueId}`,
      kind: "venue",
      destination: venue.destination,
      name: venue.name,
      lat: venue.lat,
      lng: venue.lng,
      line: next ? `${where} · next show ${weekdayDate(next)}` : where,
    };
  });

  const members = trip.crew?.members ?? {};
  const custom: Pin[] = Object.entries(trip.places?.custom ?? {}).map(([placeId, place]) => ({
    id: `place:${placeId}`,
    kind: "place",
    destination: place.destination,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    line: `${placeWord(place.kind)} · added by ${initials(members[place.addedBy]?.name ?? place.addedBy)}`,
    icon: place.kind,
    link: place.link,
    description: place.description,
    photo: place.photo,
    addedBy: place.addedBy,
  }));

  return [...stays, ...places, ...custom];
}
