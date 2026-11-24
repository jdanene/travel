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
