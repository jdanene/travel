import { weekdayDate } from "../../../lib/format";
import type { LastYearLine as Line } from "../lib/lastYear";

/**
 * The grey block of screen 20/7: an empty weekend at a venue this year,
 * and who played there on the same weekend last year. Read only.
 *
 * Inputs: line — one result of lastYearLines().
 * Output: "Sat 6 – Sun 7 Feb. Nothing announced yet. Here is who played
 * this weekend last year:" and one line per last-year show.
 * Examples (checked at 390 px against screen 7):
 *   Savaya, 6–7 Feb 2027 → "Sat 7 Feb  Nic Fanciulli", "Sun 8 Feb  Francis Mercier"
 */
export function LastYearLine({ line }: { line: Line }) {
  return (
    <div className="na">
      <p>
        <b>{weekendLabel(line.from, line.to)}.</b> Nothing announced yet. Here is who played this weekend last year:
      </p>
      {line.shows.map((show) => (
        <div key={`${show.date}-${show.artist}`} className="lr">
          <span>{weekdayDate(show.date)}</span>
          {show.artist}
        </div>
      ))}
    </div>
  );
}

/** "Sat 6 – Sun 7 Feb" inside one month; "Sat 27 Feb – Sun 1 Mar" across two. */
function weekendLabel(from: string, to: string): string {
  const start = weekdayDate(from);
  const end = weekdayDate(to);
  const sameMonth = start.split(" ")[2] === end.split(" ")[2];
  return `${sameMonth ? start.split(" ").slice(0, 2).join(" ") : start} – ${end}`;
}

/**
 * What a venue with nothing announced this year shows: "Nothing announced
 * yet." and, when the owner's list has acts there, "Last season:" with up
 * to three of them, newest first. Read only.
 *
 * A club with events this year shows the block too, under its events,
 * with only the acts its weekend lines do not show (lastSeasonRest) and no
 * "Nothing announced yet." (exception 48).
 *
 * Inputs: shows — the result of lastSeason() or lastSeasonRest(); may be
 * empty. announced — the club has events this year; then the block reads
 * "Also played here last season:", and an empty list draws nothing.
 * Output: the grey block of screen 20/7 holding the two lines, or the
 * first line alone when last season had nothing there.
 * Examples (checked on the emulator at 375 px):
 *   Atlas Beach Club → "Nothing announced yet." "Last season:" Sat 31 Jan Afrojack, Fri 2 Jan Rudimental, Thu 1 Jan Swae Lee
 *   La Brisa         → "Nothing announced yet."
 *   Desa Kitsuné, announced → "Also played here last season:" Fri 13 Mar Claptone, Fri 20 Feb Savaya × Desa series, Tue 17 Feb Savaya × Desa series
 */
export function LastSeason({ shows, announced = false }: { shows: Array<{ date: string; artist: string }>; announced?: boolean }) {
  if (shows.length === 0) return announced ? null : <p className="sub venue-empty">Nothing announced yet.</p>;
  return (
    <div className="na">
      <p>{announced ? <b>Also played here last season:</b> : <><b>Nothing announced yet.</b> Last season:</>}</p>
      {shows.map((show) => (
        <div key={`${show.date}-${show.artist}`} className="lr">
          <span>{weekdayDate(show.date)}</span>
          {show.artist}
        </div>
      ))}
    </div>
  );
}
