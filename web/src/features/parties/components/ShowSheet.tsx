import { Avatars, type Person } from "../../../components/Avatars";
import { Icon } from "../../../components/Icon";
import { Sheet } from "../../../components/Sheet";
import { initials } from "../../../lib/initials";
import { eventLink, whenLine } from "../lib/detail";
import type { ListedShow } from "../lib/shows";

interface ShowSheetProps {
  /** The show to describe; undefined while closed. */
  show?: ListedShow;
  /** "Savaya · Uluwatu, Bali". */
  where: string;
  /** The venue's one plain line ("Club on the cliffs"), when the trip has one. */
  venueLine?: string;
  going: Person[];
  you: string | null;
  /** The adder's name, for "added by KA"; undefined for a seeded show. */
  addedByName?: string;
  onIn: (isIn: boolean) => void;
  /** Closes the sheet and opens the Map on the venue; absent when the venue has no place on the map. */
  onSeeMap?: () => void;
  onClose: () => void;
}

/**
 * The show sheet: everything a friend needs to decide on one event, in the
 * shared Sheet (a bottom sheet on a phone, a centred dialog from 900 px).
 * Who is playing, in full; what it is; when and where; who is in and the
 * "I'm in" button; then the two ways out, the map and the event's own page.
 *
 * Inputs: the show, its place line and venue line, who is in, this member,
 * the adder's name, and what "I'm in", "See on the map" and closing do.
 * Output: the sheet. "Event page" opens an https link in a new tab; any
 * other link shows as plain text; no link, no button. No position, no map
 * button. There is no Directions button (exception 5).
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   Peggy Gou → "Sat 13 Feb 2027", "Savaya · Uluwatu, Bali", "Club on the cliffs", "See on the map", "Event page"
 *   Single Fin's Sunday Session → "Every Sunday from 7 Feb"
 *   tap "I'm in" → the button fills here and on the row at once
 */
export function ShowSheet({ show, where, venueLine, going, you, addedByName, onIn, onSeeMap, onClose }: ShowSheetProps) {
  return (
    <Sheet open={show !== undefined} title={show?.artist ?? ""} onClose={onClose}>
      {show && <ShowDetail show={show} where={where} venueLine={venueLine} going={going} you={you} addedByName={addedByName} onIn={onIn} onSeeMap={onSeeMap} />}
    </Sheet>
  );
}

function ShowDetail({ show, where, venueLine, going, you, addedByName, onIn, onSeeMap }: Omit<ShowSheetProps, "onClose"> & { show: ListedShow }) {
  const isIn = you !== null && going.some((person) => person.id === you);
  const link = eventLink(show.link);

  return (
    <div className="show-detail">
      {show.verified === false && <span className="nc">not confirmed</span>}
      {show.about && <p className="show-about">{show.about}</p>}

      <dl className="show-facts">
        <div>
          <dt>
            <Icon name="cal" size={20} />
            <span className="sr-only">When</span>
          </dt>
          <dd>{whenLine(show)}</dd>
        </div>
        <div>
          <dt>
            <Icon name="map" size={20} />
            <span className="sr-only">Where</span>
          </dt>
          <dd>
            {where}
            {venueLine && <span className="sub">{venueLine}</span>}
          </dd>
        </div>
      </dl>

      <div className="show-going">
        <Avatars people={going} you={you} max={8} />
        <p className="sub">{going.length ? `${going.length} in · ${going.map((person) => person.name).join(", ")}` : "Be the first in"}</p>
      </div>

      <button type="button" className="inbtn show-in" aria-pressed={isIn} disabled={you === null} onClick={() => onIn(!isIn)}>
        {isIn && <Icon name="check" />}
        I'm in
      </button>

      {(onSeeMap || link?.kind === "page") && (
        <div className="show-ways">
          {onSeeMap && (
            <button type="button" className="btn sec" onClick={onSeeMap}>
              <Icon name="map" size={20} />
              See on the map
            </button>
          )}
          {link?.kind === "page" && (
            <a className="btn sec" href={link.href} target="_blank" rel="noopener noreferrer">
              <Icon name="link" size={20} />
              Event page
            </a>
          )}
        </div>
      )}
      {link?.kind === "text" && <p className="cap show-link-text">{link.text}</p>}
      {addedByName && <p className="cap show-by">added by {initials(addedByName)}</p>}
    </div>
  );
}
