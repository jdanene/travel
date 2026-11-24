/**
 * Every date format on the page, in one place, in the mock's style
 * ("Feb 2027", "Mon 22 Feb"). Days arrive as "YYYY-MM-DD" and are read as
 * calendar days, never as moments, so no time zone can move them.
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
 * The long month and year of a day, as on the invitation.
 * Inputs: day — "YYYY-MM-DD".
 * Output: "February 2027".
 * Examples: longMonthYear("2027-02-01") → "February 2027"
 */
export function longMonthYear(day: string): string {
  const { year, month } = parts(day);
  return `${LONG_MONTHS[month]} ${year}`;
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
