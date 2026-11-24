import { Avatars, type Person } from "../../../components/Avatars";
import { Icon } from "../../../components/Icon";
import { weekdayDate } from "../../../lib/format";
import { initials } from "../../../lib/initials";
import { eventLink, every } from "../lib/detail";
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
  /** Opens the show sheet. */
  onOpen: () => void;
}

/**
 * One show on screen 20/7: the date tile, the artist, who is in, and the
 * "I'm in" button. A row the friend added, and every row for an organizer,
 * also shows "Edit". A tap anywhere else on the row opens the show sheet:
 * the artist is the row's one link, stretched over the row, so a keyboard
 * reaches it too.
 *
 * Inputs: the show, who is in, this member, the adder's name, whether this
 * device may edit it, and what the three actions do.
 * Output: the row. The artist takes two lines, then cuts (case 30); the
 * event's about line sits under it on one line, cut with "…" on a phone.
 * An https event link adds a small link button at the end of the meta
 * line, right against the "I'm in" column, that opens the event page in a
 * new tab (the mock's row keeps its three columns, so a phone keeps room
 * for the name). A show
 * nobody is in reads "Be the first in" (case 31); an unconfirmed one
 * carries "not confirmed" right under the artist, so a cut never hides it.
 * A weekly show's tile reads "Every / Sun" and screen readers hear "Every
 * Sunday".
 * Examples (checked at 375 px and 1650 px against screen 7):
 *   Peggy Gou, 4 in, RB in  → Sat 13 Feb tile, four initials, "4 in", "I'm in" filled
 *   a party KA added        → "1 in · added by KA"
 *   Single Fin's Sunday Session → "Every / Sun" tile; a tap on the tile opens the sheet
 */
export function ShowRow({ show, going, you, addedByName, canEdit, onIn, onEdit, onOpen }: ShowRowProps) {
  const isIn = you !== null && going.some((person) => person.id === you);
  const count = going.length ? `${going.length} in` : "Be the first in";
  const by = addedByName ? ` · added by ${initials(addedByName)}` : "";
  const when = show.weekly ? every(show.weekly) : weekdayDate(show.date);

  return (
    <div className="prow" id={`show-${show.id}`} tabIndex={-1}>
      <DateTile show={show} label={when} />
      <div className="who">
        <button type="button" className="artist show-open" aria-haspopup="dialog" aria-label={`${show.artist}, ${when}`} onClick={onOpen}>
          {show.artist}
        </button>
        {show.about && <p className="about">{show.about}</p>}
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
          <EventLinkButton show={show} />
        </div>
      </div>
      <button type="button" className="inbtn" aria-pressed={isIn} disabled={you === null} aria-label={`I'm in: ${show.artist}, ${when}`} onClick={() => onIn(!isIn)}>
        {isIn && <Icon name="check" />}
        I'm in
      </button>
    </div>
  );
}

/**
 * The small link button at the end of a row: opens the event's own page in
 * a new tab, so a friend reaches it without opening the sheet. Nothing for
 * a show without an https link.
 *
 * Inputs: show — its artist and link.
 * Output: a round link button, named "Event page: Peggy Gou" for screen readers, or nothing.
 * Examples (checked on screen): Peggy Gou → opens savaya.com/event-calendar/february-13-2027
 */
export function EventLinkButton({ show }: { show: { artist: string; link?: string } }) {
  const link = eventLink(show.link);
  if (link?.kind !== "page") return null;
  return (
    <a className="linkbtn" href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`Event page: ${show.artist}`}>
      <Icon name="link" size={18} />
    </a>
  );
}

/** The mock's date tile: "Sat / 13 / Feb", or "Every / Sun" for a weekly show. */
function DateTile({ show, label }: { show: ListedShow; label: string }) {
  const [weekday, day, month] = weekdayDate(show.date).split(" ");
  return (
    <div className={`dt${show.weekly ? " wk" : ""}`} role="img" aria-label={label}>
      {show.weekly ? (
        <>
          <small aria-hidden="true">Every</small>
          <b aria-hidden="true">{weekday}</b>
        </>
      ) : (
        <>
          <small aria-hidden="true">{weekday}</small>
          <b aria-hidden="true">{day}</b>
          <small aria-hidden="true">{month}</small>
        </>
      )}
    </div>
  );
}
