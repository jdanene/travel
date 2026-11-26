import { useEffect, useState } from "react";
import { Avatars, type Person } from "../../../components/Avatars";
import { Icon } from "../../../components/Icon";
import { Sheet } from "../../../components/Sheet";
import { initials } from "../../../lib/initials";
import { eventLink, timeLine, whenLine } from "../lib/detail";
import type { ListedShow } from "../lib/shows";
import { EventCard } from "./EventCard";
import { EventTags } from "./EventTags";
import { ShareButton } from "./ShareButton";
import type { WriteResult } from "../../../lib/db";

interface ShowSheetProps {
  /** The show to describe; undefined while closed. */
  show?: ListedShow;
  /** "Savaya · Uluwatu, Bali, Indonesia", as the shared event page says it (showPlace). */
  where: string;
  /** The venue's one plain line ("Club on the cliffs"), when the trip has one. */
  venueLine?: string;
  /** The venue's picture, for the card when the event has none of its own. */
  venuePhoto?: string;
  going: Person[];
  you: string | null;
  /** The adder's name, for "added by KA"; undefined for a seeded show. */
  addedByName?: string;
  /** Puts this member in or out; the answer says whether it was saved. */
  onIn: (isIn: boolean) => Promise<WriteResult>;
  /** Closes the sheet and opens the Map on the venue; absent when the venue has no place on the map. */
  onSeeMap?: () => void;
  /** The event's tags, and every tag the trip has named (tag → name). */
  tags: string[];
  tagNames: Record<string, string>;
  /** Puts a tag on the event or takes it off; absent on a device that has not joined. */
  onTag?: (tag: string, on: boolean) => Promise<WriteResult>;
  /** The event's shared page and its share line, for "Share"; absent on a device that has not joined. */
  share?: { url: string; text: string };
  /** Opens the event's edit sheet in place of this one; absent unless this member added the event or is an organizer. */
  onEdit?: () => void;
  onClose: () => void;
}

/**
 * The show sheet (design exceptions 15 and 38): what a friend who joined
 * needs to decide on one event, "am I going?", in the shared Sheet (a
 * bottom sheet on a phone, a centred dialog from 900 px). Top to bottom:
 * the event's wide card (EventCard: its picture, else the venue's, else a
 * plain card, with who is playing over its foot; the sheet's own title is
 * hidden so the name shows once), "not confirmed", the about line, when
 * (the date, then the night's start and end), where (the place and the
 * venue's line: the whole row opens our map on the venue when it has a
 * pin, with the map mark and a chevron; with no pin it is plain text),
 * then the one decision: "I'm in" with the faces and the count beside it,
 * so the answer shows where the finger is. Then the quiet options on one
 * line: "Event page" (leaves the app, so an out-arrow after its words and
 * no mark before them: exception 41), "Share", and for the friend who
 * added the event or an organizer, "Edit" (exception 43), which closes
 * this sheet and opens the edit sheet;
 * then the tags (EventTags) and "added by". The date row does nothing and
 * so has no control's look. A refused or failed "I'm in" says "This was
 * not saved." or "No connection" under it. A device that has not joined
 * sees no crew and no "I'm in". On a desktop the sheet does not scroll:
 * the card gives up height so the rest fits the window (exception 41).
 *
 * Inputs: the show, its place line, venue line and venue picture, who is
 * in, this member, the adder's name, its tags and the trip's tag names,
 * and what "I'm in", the place row, a tag, Edit and closing do.
 * Output: the sheet. "Event page" opens an https link in a new tab; any
 * other link shows as plain text; no link, no button. There is no
 * Directions button (exception 5).
 * Examples (checked on the emulator at 390 x 700 and 1650 px):
 *   Peggy Gou → Savaya's picture with "PEGGY GOU", "Sat 13 Feb 2027", "10 pm – 4 am", "Savaya · Uluwatu, Bali, Indonesia" with "Club on the cliffs" and a chevron, "I'm in", "Event page", "Share"; all of it without scrolling
 *   tap the place row → the sheet closes and the Map opens on Savaya, its card open
 *   a friend's party at a place the map does not know → the place row is plain text; the plain card
 *   tap "I'm in" → the button fills and the faces gain yours at once, here and on the row
 *   tap "Share" on a desktop → "Copied" where "Share" was
 *   an event you added, tap "Edit" → this sheet closes and the edit sheet opens; Cancel or Save brings this sheet back
 *   an event a friend added, not an organizer → no "Edit"
 */
export function ShowSheet({ show, onClose, ...rest }: ShowSheetProps) {
  return (
    <Sheet open={show !== undefined} title={show?.artist ?? ""} titleHidden onClose={onClose}>
      {show && <ShowDetail show={show} {...rest} />}
    </Sheet>
  );
}

function ShowDetail({ show, where, venueLine, venuePhoto, going, you, addedByName, onIn, onSeeMap, tags, tagNames, onTag, share, onEdit }: Omit<ShowSheetProps, "onClose"> & { show: ListedShow }) {
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => setFailed(null), [show.id]);
  const isIn = you !== null && going.some((person) => person.id === you);
  const link = eventLink(show.link);
  const time = timeLine(show);
  const place = (
    <span className="show-where-text">
      {where}
      {venueLine && <span className="sub">{venueLine}</span>}
    </span>
  );
  const answer = (next: boolean) => {
    setFailed(null);
    void onIn(next).then((result) => {
      if (!result.ok) setFailed(result.reason === "refused" ? "This was not saved." : "No connection");
    });
  };

  return (
    <div className="show-detail">
      <EventCard photos={[show.photoUrl, venuePhoto]} artist={show.artist} />
      {show.verified === false && <span className="nc">not confirmed</span>}
      {show.about && <p className="show-about">{show.about}</p>}

      <p className="show-when">
        {whenLine(show)}
        {time && <span className="sub">{time}</span>}
      </p>
      {onSeeMap ? (
        <button type="button" className="show-where show-where-go" onClick={onSeeMap}>
          <Icon name="map" size={20} />
          {place}
          <span className="sr-only">, see on the map</span>
          <Icon name="chev" size={18} />
        </button>
      ) : (
        <p className="show-where">{place}</p>
      )}

      {you !== null && (
        <>
          <div className="show-going">
            <button type="button" className="inbtn show-in" aria-pressed={isIn} onClick={() => answer(!isIn)}>
              {isIn && <Icon name="check" size={18} />}
              I'm in
            </button>
            <Avatars people={going} you={you} max={5} />
            <p className="sub">{going.length ? `${going.length} in · ${going.map((person) => person.name).join(", ")}` : "Be the first in"}</p>
          </div>
          {failed && (
            <p className="field-error show-failed" role="alert">
              {failed}
            </p>
          )}
        </>
      )}

      {(link?.kind === "page" || share || onEdit) && (
        <div className="show-ways">
          {link?.kind === "page" && (
            <a className="show-way show-way-out" href={link.href} target="_blank" rel="noopener noreferrer">
              Event page
              <Icon name="out" size={14} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          {share && <ShareButton url={share.url} text={share.text} className="show-way" />}
          {onEdit && (
            <button type="button" className="show-way" aria-label={`Edit ${show.artist}`} onClick={onEdit}>
              <Icon name="edit" size={18} />
              Edit
            </button>
          )}
        </div>
      )}
      {link?.kind === "text" && <p className="cap show-link-text">{link.text}</p>}
      <EventTags showId={show.id} tags={tags} names={tagNames} onChange={onTag} />
      {you !== null && addedByName && <p className="cap show-by">added by {initials(addedByName)}</p>}
    </div>
  );
}
