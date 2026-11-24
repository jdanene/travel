/**
 * Every date format on the page, in one place, in the mock's style
 * ("Feb 2027", "Mon 22 Feb"). Days arrive as "YYYY-MM-DD" and are read as
 * calendar days, never as moments, so no time zone can move them. The one
 * moment, ago(), counts back from now.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parts(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, date)).getUTCDay();
  return { year, month: month - 1, date, weekday };
}

/**
 * The short month and year of a day, as in the header line.
 * Inputs: day — "YYYY-MM-DD".
 * Output: "Feb 2027".
 * Examples: monthYear("2027-02-01") → "Feb 2027"
 */
export function monthYear(day: string): string {
  const { year, month } = parts(day);
  return `${MONTHS[month]} ${year}`;
}

/**
 * The months of the trip's season, long, as the flyer's date line writes
 * them, so the line says the trip runs February and March, not February.
 * Inputs: from and to — "YYYY-MM-DD", from first.
 * Output: one month and year when both days share a month; two months and
 * one year inside one year; two months with their years across a new year.
 * Examples:
 *   seasonSpan("2027-02-01", "2027-03-31") → "February – March 2027"
 *   seasonSpan("2027-02-01", "2027-02-28") → "February 2027"
 *   seasonSpan("2026-12-01", "2027-01-31") → "December 2026 – January 2027"
 */
export function seasonSpan(from: string, to: string): string {
  const a = parts(from);
  const b = parts(to);
  if (a.year !== b.year) return `${LONG_MONTHS[a.month]} ${a.year} – ${LONG_MONTHS[b.month]} ${b.year}`;
  if (a.month !== b.month) return `${LONG_MONTHS[a.month]} – ${LONG_MONTHS[b.month]} ${b.year}`;
  return `${LONG_MONTHS[a.month]} ${a.year}`;
}

/**
 * A day with its weekday, as the mock writes the anchor.
 * Inputs: day — "YYYY-MM-DD".
 * Output: "Mon 22 Feb".
 * Examples: weekdayDate("2027-02-22") → "Mon 22 Feb"
 */
export function weekdayDate(day: string): string {
  const { month, date, weekday } = parts(day);
  return `${WEEKDAYS[weekday]} ${date} ${MONTHS[month]}`;
}

/**
 * A day without its weekday, as design 12 writes the anchor.
 * Inputs: day — "YYYY-MM-DD".
 * Output: "22 Feb".
 * Examples: dayMonth("2027-02-22") → "22 Feb"
 */
export function dayMonth(day: string): string {
  const { month, date } = parts(day);
  return `${date} ${MONTHS[month]}`;
}

/**
 * A range of days, short, as on the confirmed Dates button.
 * Inputs: from and to — "YYYY-MM-DD", from first.
 * Output: "13–23 Feb" inside one month; "19 Feb – 1 Mar" across two.
 * Examples: dayRange("2027-02-13", "2027-02-23") → "13–23 Feb"
 */
export function dayRange(from: string, to: string): string {
  const a = parts(from);
  const b = parts(to);
  return a.month === b.month ? `${a.date}–${b.date} ${MONTHS[b.month]}` : `${dayMonth(from)} – ${dayMonth(to)}`;
}

/**
 * A range of days with weekdays, as the date options read on screen 20/2.
 * Inputs: from and to — "YYYY-MM-DD", from first.
 * Output: "Sat 13 – Tue 23 Feb" inside one month; "Fri 19 Feb – Mon 1 Mar" across two.
 * Examples: weekdayRange("2027-02-13", "2027-02-23") → "Sat 13 – Tue 23 Feb"
 */
export function weekdayRange(from: string, to: string): string {
  const a = parts(from);
  const b = parts(to);
  const start = a.month === b.month ? `${WEEKDAYS[a.weekday]} ${a.date}` : weekdayDate(from);
  return `${start} – ${weekdayDate(to)}`;
}

/**
 * The nights between two days.
 * Inputs: from and to — "YYYY-MM-DD", from first.
 * Output: a whole number; 0 when the days are equal.
 * Examples: nights("2027-02-13", "2027-02-23") → 10
 */
export function nights(from: string, to: string): number {
  const a = parts(from);
  const b = parts(to);
  return Math.round((Date.UTC(b.year, b.month, b.date) - Date.UTC(a.year, a.month, a.date)) / 86_400_000);
}

/**
 * How long ago a moment was, in the short words of a status line.
 * Inputs: at and now — milliseconds; at may be later than now (another
 * phone's clock), which reads as just now.
 * Output: "just now" under a minute, then "5 min ago", "3 h ago", "1 day ago", "4 days ago".
 * Examples (checked on screen): ago(now - 3 * 3_600_000, now) → "3 h ago"
 */
export function ago(at: number, now: number): string {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  const days = Math.floor(minutes / (24 * 60));
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

/**
 * The trip's months, as the title block writes them: short on screen, long
 * for screen readers.
 * Inputs: from and to — "YYYY-MM-DD", from first; style — "short" or "long".
 * Output: "Feb–Mar 2027" (short) or "February to March 2027" (long); one
 * month alone when both days share it; both years when they differ.
 * Examples (each one is a test in format.test.ts):
 *   seasonLine("2027-02-01", "2027-03-31", "short") → "Feb–Mar 2027"
 *   seasonLine("2026-12-20", "2027-01-05", "long")  → "December 2026 to January 2027"
 */
export function seasonLine(from: string, to: string, style: "short" | "long"): string {
  const a = parts(from);
  const b = parts(to);
  const names = style === "short" ? MONTHS : LONG_MONTHS;
  const join = style === "short" ? "–" : " to ";
  if (a.year !== b.year) return `${names[a.month]} ${a.year}${join}${names[b.month]} ${b.year}`;
  if (a.month === b.month) return `${names[a.month]} ${a.year}`;
  return `${names[a.month]}${join}${names[b.month]} ${b.year}`;
}

/**
 * A stay's length in words: the nights, and the weeks to the nearest half.
 * Friends think in weeks when they ask for time off.
 * Inputs: n — whole nights, 0 or more.
 * Output: "10 nights · 1.5 weeks"; the weeks part is left out under 4 nights.
 * Examples:
 *   stayLength(10) → "10 nights · 1.5 weeks"
 *   stayLength(7)  → "7 nights · 1 week"
 *   stayLength(3)  → "3 nights"
 */
export function stayLength(n: number): string {
  const nightsPart = `${n}\u00a0${n === 1 ? "night" : "nights"}`;
  if (n < 4) return nightsPart;
  const weeks = Math.round((n / 7) * 2) / 2;
  return `${nightsPart} · ${weeks}\u00a0${weeks === 1 ? "week" : "weeks"}`;
}
