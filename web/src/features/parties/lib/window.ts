/**
 * The days the automatic events check looks for, and where last year's
 * lines show: the last week of January to the end of March 2027 (owner,
 * 24 Nov 2026: "add the last week of Jan, which has Zamna in one of our
 * locations"). A friend may add an event on any day (owner, 24 Nov 2026:
 * "don't restrict the calendar"), so neither the Add an event sheet nor
 * database.rules.json uses it. services/link-reader/events.mjs fixes the
 * same days for the check; change both together.
 */
export const EVENTS_WINDOW = { from: "2027-01-25", to: "2027-03-31" } as const;

/**
 * Whether a day is a real calendar day inside EVENTS_WINDOW.
 * Inputs: day — "YYYY-MM-DD", untrusted.
 * Output: true for a real day from 25 Jan to 31 Mar 2027.
 * Examples (each is a test in window.test.ts):
 *   inEventsWindow("2027-01-30") → true   (Zamna's week)
 *   inEventsWindow("2027-01-24") → false
 *   inEventsWindow("2027-02-30") → false  (no such day)
 */
export function inEventsWindow(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const real = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(real.getTime()) || real.toISOString().slice(0, 10) !== day) return false;
  return day >= EVENTS_WINDOW.from && day <= EVENTS_WINDOW.to;
}
