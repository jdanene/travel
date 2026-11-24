import { placeWord } from "../../features/map/lib/places";
import { venueKey } from "../../features/parties/lib/shows";
import { idFromName } from "../../lib/ids";
import { initials } from "../../lib/initials";
import { weekdayDate } from "../../lib/format";
import type { Pin } from "../../types/pin";
import type { Trip } from "../../types/trip";
import { datesSettled } from "./modules";

/**
 * Every pin of the trip's map in one list, for every destination at once:
 * the stay options, the venues with an event this season, and friends'
 * places. The map holds them all and only moves its camera between
 * destinations; it never hides a pin. It lives in app/ because it joins
 * stay, parties and places; the map feature only draws what it is given.
 *
 * Stay pins: one per stay option, at the centre of its area, because a
 * listing gives no exact position (D10); an unknown area puts the pin at
 * the destination's centre (case 33). None while the dates are not
 * confirmed (exception 3).
 * Venue pins: one per venue of places/venues with at least one event this
 * season (parties/shows), whatever its tags; the Events filter does not
 * touch the map (owner, 24 Nov 2026: "If I zoom out on the map to see
 * Thailand, the Philippines and Bali, I expect all the events to show
 * too"). A venue with only last-season lines gets no pin. A friend's party
 * at another venue gets no pin (case 34); its row still shows in Events.
 * Friends' places: one per entry in places/custom ("Add to map"), where
 * the friend put it, with its kind's icon, its link and who added it.
 *
 * Inputs: trip — the whole trip.
 * Output: the pins, stays first, then venues, then friends' places. A venue's card line is its own line (or
 * its area) and its next show this season.
 * Examples (each is a test in pins.test.ts):
 *   Savaya with a show on 13 Feb, Klymax with none → one venue pin, Savaya, line "Club on the cliffs · next show Sat 13 Feb"
 *   a stay option before the dates are confirmed    → no stay pin; after → a pin at its area's centre
 *   Kai adds "Sunset bar", Food                     → a place pin, line "Food · added by KA", even with no event anywhere
 */
export function pins(trip: Trip): Pin[] {
  const areas = trip.places?.areas ?? {};
  const venues = trip.places?.venues ?? {};
  const destinations = trip.info?.destinations ?? {};

  const stays: Pin[] = [];
  if (datesSettled(trip)) {
    for (const [stayId, option] of Object.entries(trip.stay?.options ?? {})) {
      const area = Object.values(areas).find((candidate) => idFromName(candidate.name) === idFromName(option.area));
      const centre = area ?? (option.destination ? destinations[option.destination] : undefined);
      if (centre?.lat === undefined || centre.lng === undefined) continue;
      const facts = [option.area, option.sleeps ? `sleeps ${option.sleeps}` : null].filter(Boolean).join(" · ");
      stays.push({ id: `stay:${stayId}`, kind: "stay", destination: option.destination ?? area?.destination ?? "", name: option.name, lat: centre.lat, lng: centre.lng, line: facts });
    }
  }

  // Each venue's first event this season, by venueKey().
  const nextShow = new Map<string, string>();
  for (const show of Object.values(trip.parties?.shows ?? {})) {
    const key = venueKey(show.destination, show.venue);
    if (!nextShow.has(key) || show.date < nextShow.get(key)!) nextShow.set(key, show.date);
  }

  const places: Pin[] = Object.entries(venues).flatMap(([venueId, venue]) => {
    const next = nextShow.get(venueKey(venue.destination, venue.name));
    if (!next) return [];
    const where = venue.line ?? (venue.areaId ? areas[venue.areaId]?.name : undefined) ?? destinations[venue.destination]?.name ?? "";
    return [{ id: `venue:${venueId}`, kind: "venue" as const, destination: venue.destination, name: venue.name, lat: venue.lat, lng: venue.lng, line: `${where} · next show ${weekdayDate(next)}` }];
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
