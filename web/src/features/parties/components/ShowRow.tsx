import { Avatars, type Person } from "../../../components/Avatars";
import { Icon } from "../../../components/Icon";
import { weekdayDate } from "../../../lib/format";
import { initials } from "../../../lib/initials";
import type { ListedShow } from "../lib/shows";

interface ShowRowProps {
  show: ListedShow;
  /** Who is in, in reply order. */
  going: Person[];
  /** This device's member; null before a reply, and then the button is off. */
  you: string | null;
  /** The name of the friend who added it, for "added by KA"; undefined for a seeded show. */
  addedByName?: string;
  canEdit: boolean;
  onIn: (isIn: boolean) => void;
  onEdit: () => void;
}

/**
 * One show on screen 20/7: the date tile, the artist, who is in, and the
 * "I'm in" button. A row the friend added, and every row for an organizer,
 * also shows "Edit".
 *
 * Inputs: the show, who is in, this member, the adder's name, whether this
 * device may edit it, and what the two buttons do.
 * Output: the row. The artist takes two lines, then cuts (case 30). A show
 * nobody is in reads "Be the first in" (case 31); an unconfirmed one
 * carries "not confirmed" right under the artist, so a cut never hides it.
 * Examples (checked at 390 px against screen 7):
 *   Peggy Gou, 4 in, RB in  → Sat 13 Feb tile, four initials, "4 in", "I'm in" filled
 *   a party KA added        → "1 in · added by KA"
 */
export function ShowRow({ show, going, you, addedByName, canEdit, onIn, onEdit }: ShowRowProps) {
  const [weekday, day, month] = weekdayDate(show.date).split(" ");
  const isIn = you !== null && going.some((person) => person.id === you);
  const count = going.length ? `${going.length} in` : "Be the first in";
  const by = addedByName ? ` · added by ${initials(addedByName)}` : "";

  return (
    <div className="prow" id={`show-${show.id}`} tabIndex={-1}>
      <div className="dt" role="img" aria-label={weekdayDate(show.date)}>
        <small aria-hidden="true">{weekday}</small>
        <b aria-hidden="true">{day}</b>
        <small aria-hidden="true">{month}</small>
      </div>
      <div className="who">
        <b className="artist">{show.artist}</b>
        <div className="meta">
          {show.verified === false && <span className="nc">not confirmed</span>}
          <Avatars people={going} you={you} max={4} />
          <span>
            {count}
            {by}
          </span>
          {canEdit && (
            <button type="button" className="edit" onClick={onEdit} aria-label={`Edit ${show.artist}`}>
              Edit
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        className="inbtn"
        aria-pressed={isIn}
        disabled={you === null}
        aria-label={`I'm in: ${show.artist}, ${weekdayDate(show.date)}`}
        onClick={() => onIn(!isIn)}
      >
        {isIn && <Icon name="check" />}
        I'm in
      </button>
    </div>
  );
}
