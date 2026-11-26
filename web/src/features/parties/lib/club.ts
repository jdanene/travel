import { idFromName } from "../../../lib/ids";
import { placeName } from "../../../lib/place";
import type { DestinationId, Trip } from "../../../types/trip";
import { areaLine } from "./detail";

/**
 * The parties context's rules for the club sheet (owner, 25 Nov 2026: "a
 * modal … w/ a nice pic of the club and its website and insta links plus a
 * link to were it is in google map"): what the sheet says about one venue,
 * and which of its links may open.
 */

/** Everything the club sheet shows about one venue. */
export interface Club {
  name: string;
  /** "Uluwatu, Bali, Indonesia". */
  where: string;
  /** The venue's one plain line ("Club on the cliffs"), when the trip has one. */
  line?: string;
  photoUrl?: string;
  website?: string;
  instagram?: string;
  /** Its Google Maps search link. */
  maps: string;
}

/**
 * Keeps a stored link only when it is safe to open: an https address of at
 * most 500 characters that parses. The sheet renders no other href, so a
 * bad value in the data is simply absent, never a broken or http link.
 *
 * Inputs: value — anything the database held.
 * Output: the address, trimmed, or null.
 * Examples (each is a test in club.test.ts):
 *   httpsLink("https://www.savaya.com/")  → "https://www.savaya.com/"
 *   httpsLink("http://savaya.com")        → null
 *   httpsLink("javascript:alert(1)")      → null
 *   httpsLink(42)                         → null
 */
export function httpsLink(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length > 500 || !text.startsWith("https://")) return null;
  try {
    return new URL(text).protocol === "https:" ? text : null;
  } catch {
    return null;
  }
}

/**
 * The club's Google Maps link: a plain search, no key and no embed. It
 * searches the club's name with its area and country, so Google opens the
 * club's own listing; coordinates alone would drop an unnamed pin, and a
 * venue that is not on OpenStreetMap only has its area's centre.
 *
 * Inputs: name — the venue's name; where — its area line ("Uluwatu, Bali, Indonesia").
 * Output: https://www.google.com/maps/search/?api=1&query=<name, where>, encoded.
 * Examples (each is a test in club.test.ts):
 *   mapsLink("Savaya", "Uluwatu, Bali, Indonesia")                 → "…?api=1&query=Savaya%2C%20Uluwatu%2C%20Bali%2C%20Indonesia"
 *   mapsLink("Café del Mar Bali", "Canggu, Bali, Indonesia")       → "…query=Caf%C3%A9%20del%20Mar%20Bali%2C%20Canggu%2C%20Bali%2C%20Indonesia"
 *   mapsLink("CÉ LA VI", "Marina Bay, Singapore")                  → "…query=C%C3%89%20LA%20VI%2C%20Marina%20Bay%2C%20Singapore"
 */
export function mapsLink(name: string, where: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name.trim()}, ${where}`)}`;
}

/**
 * Says what the club sheet shows for a venue heading of the Events list:
 * the trip's venue of that name in that destination (places/venues) gives
 * its area, line, picture, website and Instagram; a venue a friend typed
 * that the trip does not know has its name, the area its event names, and
 * its destination. Every link passes httpsLink; Google Maps is always there.
 *
 * Inputs: venue — its destination, its name as listed, and the area its
 * event names, if any; trip — its info and places.
 * Output: the Club.
 * Examples (each is a test in club.test.ts):
 *   Savaya in Bali → { name: "Savaya", where: "Uluwatu, Bali, Indonesia", line: "Club on the cliffs", photoUrl, website, instagram, maps }
 *   "Kai's villa" in Bali, unknown to the trip → { name: "Kai's villa", where: "Bali, Indonesia", maps }
 */
export function clubOf(venue: { destination: DestinationId; name: string; area?: string }, trip: Pick<Trip, "info" | "places">): Club {
  const destination = trip.info?.destinations?.[venue.destination];
  const named = destination ? placeName(destination.name, destination.country) : venue.destination;
  const wanted = idFromName(venue.name);
  const record = Object.values(trip.places?.venues ?? {}).find((one) => one?.destination === venue.destination && typeof one.name === "string" && idFromName(one.name) === wanted);
  const area = venue.area ?? trip.places?.areas?.[record?.areaId ?? ""]?.name;
  const where = areaLine(venue.name, area, named);
  const photoUrl = httpsLink(record?.photoUrl);
  const website = httpsLink(record?.website);
  const instagram = httpsLink(record?.instagram);
  return {
    name: venue.name,
    where,
    ...(typeof record?.line === "string" && record.line.trim() ? { line: record.line } : {}),
    ...(photoUrl ? { photoUrl } : {}),
    ...(website ? { website } : {}),
    ...(instagram ? { instagram } : {}),
    maps: mapsLink(venue.name, where),
  };
}
