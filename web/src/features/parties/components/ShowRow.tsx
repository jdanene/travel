import { Avatars, type Person } from "../../../components/Avatars";
import { Icon } from "../../../components/Icon";
import { weekdayDate } from "../../../lib/format";
import { initials } from "../../../lib/initials";
import { every } from "../lib/detail";
import type { ListedShow } from "../lib/shows";

interface ShowRowProps {
  show: ListedShow;
  /** Who is in, in reply order. */
  going: Person[];
  /** This device's member; null on the shared events page, which shows no crew and no "I'm in". */
  you: string | null;
  /** The name of the friend who added it, for "added by KA"; undefined for a seeded show. */
  addedByName?: string;
  canEdit: boolean;
  /** The names of the event's tags to show as small grey labels; the picked filter's tag is left out, as its chip already says it. */
  tags: string[];
  onIn: (isIn: boolean) => void;
  onEdit: () => void;
  /** Opens the show sheet. */
  onOpen: () => void;
  /** On the shared events page: the event's own page, which the artist links to instead of the sheet. */
  href?: string;
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
 * The row has no link button of its own (owner, 25 Nov 2026: "u have two
 * links one when u press the event and one is the link icon.. u can remove
 * the link icon"): the event's own page is "Event page" in its sheet and on
 * its shared page. A show
 * nobody is in reads "Be the first in" (case 31); an unconfirmed one
 * carries "not confirmed" right under the artist, so a cut never hides it.
 * A weekly show's tile reads "Every / Sun" and screen readers hear "Every
 * Sunday". The event's tags sit under the about line as small grey labels,
 * all but the picked filter's.
 * On the shared events page (you null) the row shows no crew: no faces,
 * no count, no "added by", and no "I'm in"; the artist links to the
 * event's own page.
 * Examples (checked at 375 px and 1650 px against screen 7):
 *   Peggy Gou, 4 in, RB in  → Sat 13 Feb tile, four initials, "4 in", "I'm in" filled
 *   a party KA added        → "1 in · added by KA"
 *   under "Big nights", Peggy Gou tagged Big nights and Rooftop → one grey "Rooftop" label
 *   Single Fin's Sunday Session → "Every / Sun" tile; a tap on the tile opens the sheet
 */
export function ShowRow({ show, going, you, addedByName, canEdit, tags, onIn, onEdit, onOpen, href }: ShowRowProps) {
  const visitor = you === null;
  const isIn = you !== null && going.some((person) => person.id === you);
  const count = going.length ? `${going.length} in` : "Be the first in";
  const by = addedByName ? ` · added by ${initials(addedByName)}` : "";
  const when = show.weekly ? every(show.weekly) : weekdayDate(show.date);

  return (
    <div className="prow" id={`show-${show.id}`} tabIndex={-1}>
      <DateTile show={show} label={when} />
      <div className="who">
        {href ? (
          <a className="artist show-open" href={href} aria-label={`${show.artist}, ${when}`}>
            {show.artist}
          </a>
        ) : (
          <button type="button" className="artist show-open" aria-haspopup="dialog" aria-label={`${show.artist}, ${when}`} onClick={onOpen}>
            {show.artist}
          </button>
        )}
        {show.about && <p className="about">{show.about}</p>}
        {tags.length > 0 && (
          <p className="row-tags">
            <span className="sr-only">Tags: </span>
            {tags.map((name) => (
              <span key={name} className="tag-label">
                {name}
              </span>
            ))}
          </p>
        )}
        <div className="meta">
          {show.verified === false && <span className="nc">not confirmed</span>}
          {!visitor && (
            <>
              <Avatars people={going} you={you} max={4} />
              <span>
                {count}
                {by}
              </span>
            </>
          )}
          {canEdit && (
            <button type="button" className="edit" onClick={onEdit} aria-label={`Edit ${show.artist}`}>
              Edit
            </button>
          )}
        </div>
      </div>
      {!visitor && (
        <button type="button" className="inbtn" aria-pressed={isIn} aria-label={`I'm in: ${show.artist}, ${when}`} onClick={() => onIn(!isIn)}>
          {isIn && <Icon name="check" />}
          I'm in
        </button>
      )}
    </div>
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
