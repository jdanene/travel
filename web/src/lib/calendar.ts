/**
 * The day arithmetic behind the shared calendar (components/Calendar.tsx).
 * Days are "YYYY-MM-DD" and months "YYYY-MM", read in UTC, so a phone's
 * time zone never moves a day.
 */

/**
 * Whether text is a real calendar day.
 * Inputs: day — "YYYY-MM-DD", untrusted.
 * Output: true for a day that exists.
 * Examples (each is a test in calendar.test.ts):
 *   isDay("2027-01-24") → true   (any month, any year: owner, 24 Nov 2026)
 *   isDay("2027-02-30") → false  (no such day)
 */
export function isDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const real = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(real.getTime()) && real.toISOString().slice(0, 10) === day;
}

/**
 * A day some days away.
 * Inputs: day — "YYYY-MM-DD"; n — days, negative for earlier.
 * Output: the day, "YYYY-MM-DD".
 * Examples (each is a test in calendar.test.ts): addDays("2027-02-28", 1) → "2027-03-01"
 */
export function addDays(day: string, n: number): string {
  const at = new Date(`${day}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + n);
  return at.toISOString().slice(0, 10);
}

/**
 * A month some months away.
 * Inputs: month — "YYYY-MM"; n — months, negative for earlier.
 * Output: the month, "YYYY-MM".
 * Examples (each is a test in calendar.test.ts): addMonths("2027-01", -1) → "2026-12"
 */
export function addMonths(month: string, n: number): string {
  const [year, at] = month.split("-").map(Number);
  const index = year * 12 + (at - 1) + n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/**
 * The days of a month as the calendar draws them: weeks from Monday, with
 * an empty cell (null) before the 1st and after the last day.
 * Inputs: month — "YYYY-MM".
 * Output: whole weeks of seven cells.
 * Examples (each is a test in calendar.test.ts):
 *   monthGrid("2027-02") → 4 weeks, from "2027-02-01" (a Monday) to "2027-02-28"
 *   monthGrid("2027-03") → 5 weeks; the first starts with "2027-03-01", the last ends with 4 empty cells
 */
export function monthGrid(month: string): Array<Array<string | null>> {
  const first = `${month}-01`;
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: Array<string | null> = Array.from({ length: lead }, () => null);
  for (let day = first; day.startsWith(month); day = addDays(day, 1)) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}
