import type { DestinationId } from "../../../types/trip";
import { venueKey, type ShowKey } from "./shows";

/** 52 weeks: last year's day on the same weekday (Sat 6 Feb 2027 → Sat 7 Feb 2026). */
const DAYS_BACK = 364;

/** One grey block of screen 7: "Sat 6 – Sun 7 Feb. Nothing announced yet. …". */
export interface LastYearLine {
  destination: DestinationId;
  /** The venue as this year's list spells it. */
  venue: string;
  /** This year's Saturday and Sunday, "YYYY-MM-DD". */
  from: string;
  to: string;
  /** Last year's shows on the same weekend, by date, with last year's dates. */
  shows: Array<{ date: string; artist: string }>;
}

const toDay = (time: number) => new Date(time).toISOString().slice(0, 10);
const timeOf = (day: string) => Date.parse(`${day}T00:00:00Z`);
const addDays = (day: string, days: number) => toDay(timeOf(day) + days * 86_400_000);
const weekday = (day: string) => new Date(timeOf(day)).getUTCDay();

/**
 * Decides where the list says "Nothing announced yet. Here is who played
 * this weekend last year:" (requirements section 0, goal 3). For each venue
 * that has a show this year, and each weekend of the events window, it looks for
 * an empty weekend at that venue and fills it with what played there on
 * the same weekend last year.
 *
 * A weekend is Saturday and Sunday, as screen 7 draws it ("Sat 6 – Sun 7
 * Feb"). On the real data the plan's Friday-to-Sunday weekend would add a
 * Friday row the mock does not show, so the mock wins.
 *
 * Inputs: shows — this year's shows (a weekly show is skipped: it says
 * nothing about one weekend); lastYear — last year's shows; window —
 * the first and last day events may fall on, "YYYY-MM-DD" (EVENTS_WINDOW,
 * 25 Jan to 31 Mar 2027, so last year's lines reach back to late January
 * 2026). Venue names match across the two lists ignoring case and spaces.
 * A weekend half inside the window counts only its days inside.
 * Output: one line per venue and empty weekend that last year filled, by
 * destination, venue and date. A weekend with a show this year has no
 * line; a weekend last year left empty has no line either; a last-year
 * show on a weekday is never shown.
 * Examples (each is a test in lastYear.test.ts):
 *   Savaya has Sat 13 and Sun 14 Feb 2027; last year had Sat 31 Jan, Fri 6,
 *   Sat 7, Sun 8 and Sat 14 Feb 2026
 *     → two lines: Sat 30 – Sun 31 Jan: Sat 31 Jan Black Coffee;
 *       Sat 6 – Sun 7 Feb: Sat 7 Feb Nic Fanciulli, Sun 8 Feb Francis Mercier
 *   last year " SAVAYA" on Sun 1 Mar 2026, this year nothing on Sat 27 – Sun 28 Feb 2027
 *     → one Savaya line for 27–28 Feb that holds Sun 1 Mar 2026
 */
export function lastYearLines(shows: Array<ShowKey & { weekly?: string }>, lastYear: ShowKey[], window: { from: string; to: string }): LastYearLine[] {
  const venues = new Map<string, { destination: DestinationId; venue: string; days: Set<string> }>();
  for (const show of shows.filter((one) => !one.weekly).sort((a, b) => a.date.localeCompare(b.date))) {
    const key = venueKey(show.destination, show.venue);
    const venue = venues.get(key) ?? { destination: show.destination, venue: show.venue.trim(), days: new Set<string>() };
    venue.days.add(show.date);
    venues.set(key, venue);
  }

  const before = new Map<string, Array<{ date: string; artist: string }>>();
  for (const show of lastYear) {
    const key = `${venueKey(show.destination, show.venue)}|${show.date}`;
    before.set(key, [...(before.get(key) ?? []), { date: show.date, artist: show.artist }]);
  }

  const lines: LastYearLine[] = [];
  for (const [key, venue] of venues) {
    for (const saturday of saturdays(window)) {
      const weekend = [saturday, addDays(saturday, 1)].filter((day) => day >= window.from && day <= window.to);
      if (weekend.some((day) => venue.days.has(day))) continue;
      const played = weekend.flatMap((day) => before.get(`${key}|${addDays(day, -DAYS_BACK)}`) ?? []);
      if (played.length > 0) lines.push({ destination: venue.destination, venue: venue.venue, from: saturday, to: addDays(saturday, 1), shows: played });
    }
  }
  return lines.sort(
    (a, b) => a.destination.localeCompare(b.destination) || a.venue.localeCompare(b.venue, "en", { sensitivity: "base" }) || a.from.localeCompare(b.from),
  );
}

/**
 * What a venue with nothing announced this year shows under "Last season:":
 * the acts that played there last year, any month, newest first.
 *
 * Inputs: destination and venue — the venue as the list names it (case and
 * spaces do not count); lastYear — last year's shows; max — how many to
 * keep; all of them unless given (the owner wants the whole season shown).
 * Output: { date, artist } with last year's dates, newest first; empty when
 * last year has nothing at that venue.
 * Examples (each is a test in lastYear.test.ts):
 *   Atlas Beach Club: Swae Lee 1 Jan, Afrojack 31 Jan, Rudimental 2 Jan  → Afrojack, Rudimental, Swae Lee
 *   a venue last year never listed                                     → []
 */
export function lastSeason(destination: DestinationId, venue: string, lastYear: ShowKey[], max = Infinity): Array<{ date: string; artist: string }> {
  const key = venueKey(destination, venue);
  return lastYear
    .filter((show) => venueKey(show.destination, show.venue) === key)
    .sort((a, b) => b.date.localeCompare(a.date) || a.artist.localeCompare(b.artist))
    .slice(0, max)
    .map(({ date, artist }) => ({ date, artist }));
}

/** Every Saturday whose weekend touches the window, the Saturday before it included. */
function saturdays(window: { from: string; to: string }): string[] {
  const first = addDays(window.from, -((weekday(window.from) + 1) % 7));
  const days: string[] = [];
  for (let day = first; day <= window.to; day = addDays(day, 7)) days.push(day);
  return days;
}
