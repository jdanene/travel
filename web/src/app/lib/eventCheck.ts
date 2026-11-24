import { showId } from "../../features/parties/lib/shows";
import type { FoundEvent } from "../../lib/reader";
import type { Show, Trip } from "../../types/trip";

/**
 * The rules of the events check, kept pure: when it is due, and which of
 * the events it found become new shows. The shell holds them because the
 * check reads the parties context (showId) and runs for the whole page.
 */

/** The check runs at most once in this long, for the whole trip. */
export const CHECK_EVERY_MS = 12 * 60 * 60 * 1000;

/**
 * Says whether the trip's events check is due, so a friend who opens the
 * trip starts it only when nobody has in the last 12 hours.
 *
 * Inputs: lastAt — parties/lastCheck/at, or undefined when the check never
 * ran; now — this device's clock, in milliseconds.
 * Output: true when there is no last check, or it is 12 hours old or more.
 * Examples (each is a test in eventCheck.test.ts):
 *   checkIsDue(undefined, now)              → true
 *   checkIsDue(now - 12 h, now)             → true
 *   checkIsDue(now + 30 s, now)             → false   (another phone's clock runs ahead)
 */
export function checkIsDue(lastAt: number | undefined, now: number): boolean {
  return lastAt === undefined || now - lastAt >= CHECK_EVERY_MS;
}

/**
 * Turns the events the check found into the shows to add: each one the trip
 * does not list yet, under the same id the seed and Add a party use, so a
 * show is never listed twice under one id. What the rules would refuse is
 * dropped here instead.
 *
 * Inputs: events — from the reader, untrusted; trip — the trip as loaded;
 * now — the time to stamp on each show.
 * Output: showId → the show to write, with source "check", verified false
 * and no addedBy. An event is dropped when its destination is not the
 * trip's, its date is not a day from 1 Feb to 31 Mar 2027, its venue or
 * artist is empty or too long, its link is not https, or its id is listed.
 * Examples (each is a test in eventCheck.test.ts):
 *   BEN BÖHMER at Savaya on 28 Feb, not listed → { "bali_2027-02-28_savaya_ben-bohmer": { …, source: "check", verified: false } }
 *   PEGGY GOU on 13 Feb, seeded as "Peggy Gou", and a show on 30 Feb → {}   (the same id; no such day)
 */
export function newShows(events: FoundEvent[], trip: Trip, now: number): Record<string, Show> {
  const listed = trip.parties?.shows ?? {};
  const shows: Record<string, Show> = {};
  for (const event of events) {
    const venue = event.venue.trim();
    const artist = event.artist.trim();
    const area = event.area?.trim();
    const fits =
      trip.info?.destinations?.[event.destination] !== undefined &&
      /^2027-0[23]-(0[1-9]|[12]\d|3[01])$/.test(event.date) &&
      new Date(`${event.date}T00:00:00Z`).getUTCDate() === Number(event.date.slice(8)) &&
      venue.length >= 1 && venue.length <= 60 &&
      artist.length >= 1 && artist.length <= 200 &&
      (!area || area.length <= 60) &&
      event.link.startsWith("https://") && event.link.length <= 500;
    if (!fits) continue;
    const id = showId({ destination: event.destination, venue, date: event.date, artist });
    if (listed[id] || shows[id]) continue;
    shows[id] = { destination: event.destination, venue, ...(area ? { area } : {}), date: event.date, artist, link: event.link, verified: false, source: "check", at: now };
  }
  return shows;
}
