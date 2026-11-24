import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { addDays, addMonths, isDay, monthGrid } from "../lib/calendar";
import { Icon } from "./Icon";
import "./Calendar.css";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The month a calendar opens on when nothing is picked and the trip says nothing: February 2027 (owner, 24 Nov 2026). */
export const DEFAULT_MONTH = "2027-02";

const monthOf = (day: string) => day.slice(0, 7);
const monthTitle = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
const weekdayIndex = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
const spoken = (day: string) => `${WEEKDAYS[weekdayIndex(day)]} ${Number(day.slice(8))} ${MONTHS[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;

/**
 * A picked day as a field shows it, with its year, since any year may be picked.
 * Inputs: day — "YYYY-MM-DD". Output: "Sat 13 Feb 2027".
 * Examples (checked on screen): dayLabel("2027-02-13") → "Sat 13 Feb 2027"
 */
export function dayLabel(day: string): string {
  return `${WEEKDAY_SHORT[weekdayIndex(day)]} ${Number(day.slice(8))} ${SHORT[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;
}

interface CalendarProps {
  /** The picked day, or the first day of the picked range; "" for none. */
  from: string;
  /** The last day of the picked range; "" for none. Absent for a one-day calendar. */
  to?: string;
  /** A one-day calendar gets one day; a range gets the first tap as its start and the second as its end. */
  onPick: (from: string, to: string) => void;
  /** The month to open on when nothing is picked, "YYYY-MM". */
  startMonth?: string;
  /** Names the grid for screen readers: "Date", "Check-in and check-out". */
  label: string;
}

/**
 * The one calendar of the app (owner, 24 Nov 2026: "the calendar does not
 * look sleek at all… don't restrict the calendar… the default start be
 * Feb"): a month grid from Monday in the app's own skin, with arrows to
 * any month of any year. No day is out of reach. A picked day is black
 * with white text; a range's days between its ends sit on the soft grey.
 * It opens on the picked day's month, else startMonth, else February 2027.
 * Arrow keys move a day or a week, Page Up and Page Down a month, and
 * Enter or Space picks, as in a date grid.
 *
 * Inputs: the picked day or range, what picking does, the month to open
 * on, and its name.
 * Output: the month grid. In a range, a tap before the start, or any tap
 * once both ends are set, starts a new range.
 * Examples (checked at 375 px and 1650 px):
 *   one day, nothing picked                  → February 2027; tap 13 → onPick("2027-02-13", "")
 *   range, from 13 Feb, tap 23 Feb           → onPick("2027-02-13", "2027-02-23"); 14 to 22 Feb grey
 *   tap "Previous month" twice from February → December 2026, every day can be picked
 */
export function Calendar({ from, to, onPick, startMonth, label }: CalendarProps) {
  const range = to !== undefined;
  const [month, setMonth] = useState(isDay(from) ? monthOf(from) : (startMonth ?? DEFAULT_MONTH));
  const [focusDay, setFocusDay] = useState(isDay(from) ? from : `${month}-01`);
  const grid = useRef<HTMLTableElement>(null);
  const moved = useRef(false);
  const titleId = useId();

  // After a key moved the focus, put it on the new day once it is drawn.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [focusDay, month]);

  const pick = (day: string) => {
    setFocusDay(day);
    if (!range) return onPick(day, "");
    if (!from || (from && to) || day < from) return onPick(day, "");
    onPick(from, day);
  };

  const goMonth = (n: number) => {
    const next = addMonths(month, n);
    setMonth(next);
    setFocusDay(`${next}-01`);
  };

  const keys = (event: KeyboardEvent<HTMLButtonElement>, day: string) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    let next: string | undefined;
    if (step) next = addDays(day, step);
    else if (event.key === "PageUp" || event.key === "PageDown") {
      const target = addMonths(monthOf(day), event.key === "PageUp" ? -1 : 1);
      const date = Math.min(Number(day.slice(8)), monthGrid(target).flat().filter(Boolean).length);
      next = `${target}-${String(date).padStart(2, "0")}`;
    }
    if (!next) return;
    event.preventDefault();
    moved.current = true;
    setFocusDay(next);
    setMonth(monthOf(next));
  };

  const inRange = (day: string) => range && from !== "" && to !== "" && to !== undefined && day > from && day < to;
  const isEnd = (day: string) => day === from || (range && day === to);
  const tabDay = monthOf(focusDay) === month ? focusDay : `${month}-01`;

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="cal-step" aria-label="Previous month" onClick={() => goMonth(-1)}>
          <Icon name="back" size={20} />
        </button>
        <b id={titleId} aria-live="polite">
          {monthTitle(month)}
        </b>
        <button type="button" className="cal-step" aria-label="Next month" onClick={() => goMonth(1)}>
          <Icon name="chev" size={20} />
        </button>
      </div>
      <table ref={grid} className="cal-grid" role="grid" aria-label={label} aria-describedby={titleId}>
        <thead>
          <tr>
            {WEEKDAY_SHORT.map((name, at) => (
              <th key={name} scope="col" abbr={WEEKDAYS[at]}>
                {name.slice(0, 2)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(month).map((week, row) => (
            <tr key={row}>
              {week.map((day, at) =>
                day ? (
                  <td key={day} className={inRange(day) ? "in" : isEnd(day) && range && from && to && from !== to ? (day === from ? "in start" : "in end") : undefined}>
                    <button
                      type="button"
                      data-day={day}
                      tabIndex={day === tabDay ? 0 : -1}
                      aria-pressed={isEnd(day)}
                      aria-label={spoken(day)}
                      onClick={() => pick(day)}
                      onKeyDown={(event) => keys(event, day)}
                    >
                      {Number(day.slice(8))}
                    </button>
                  </td>
                ) : (
                  <td key={`e${at}`} />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface DateFieldProps extends Omit<CalendarProps, "label"> {
  /** The field's label: "Date", "Dates (optional)". */
  label: string;
  /** What the field says before a pick. */
  placeholder: string;
  /** Wires the field to its error line. */
  id?: string;
  name?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  /** The refusal under the field, if any. */
  error?: ReactNode;
}

/**
 * A date field in the sheets' pattern (.field) that opens the shared
 * calendar under it, in place, so nothing covers the form on a phone.
 * Shows "Sat 13 Feb 2027", or "Sat 13 Feb 2027 – Tue 23 Feb 2027" for a
 * range. A one-day pick closes the calendar; a range closes once both ends
 * are set.
 *
 * Inputs: the label, the words before a pick, the picked day or range,
 * what picking does, the month to open on, and the error wiring.
 * Output: the field and, while open, the calendar.
 * Examples (checked at 375 px and 1650 px):
 *   Add an event, tap Date, tap 13 → "Sat 13 Feb 2027", the calendar closes
 */
export function DateField({ label, placeholder, from, to, onPick, startMonth, error, id, ...field }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const shown = isDay(from) ? (to && isDay(to) && to !== from ? `${dayLabel(from)} – ${dayLabel(to)}` : dayLabel(from)) : "";
  return (
    <div className="date-field">
      <button type="button" id={id} className="field date-button" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((now) => !now)} {...field}>
        <small>{label}</small>
        <span className={shown ? undefined : "date-empty"}>{shown || placeholder}</span>
        <Icon name="cal" size={20} />
      </button>
      {error}
      <div id={panel} hidden={!open}>
        {open && (
          <Calendar
            from={from}
            to={to}
            startMonth={startMonth}
            label={label}
            onPick={(start, end) => {
              onPick(start, end);
              if (to === undefined || end) setOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
