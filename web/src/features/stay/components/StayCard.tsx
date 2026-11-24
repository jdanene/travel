import { Avatars, type Person } from "../../../components/Avatars";
import { Icon } from "../../../components/Icon";
import { idFromName } from "../../../lib/ids";
import { initials } from "../../../lib/initials";
import type { StayOption } from "../../../types/trip";
import { scenery } from "./scenery";

interface StayCardProps {
  id: string;
  option: StayOption;
  /** The name of the friend who added it. */
  addedBy: string;
  hearted: Person[];
  you: string;
  onHeart: (on: boolean) => void;
  /** Shown to an organizer while the destination has no confirmed stay. */
  onConfirm?: () => void;
}

/**
 * One stay option (a row of 20/4): the photo, the name, its facts, "Open
 * listing", who hearted it, and the heart with its count.
 *
 * Inputs: the option, who added it, who hearted it, this member, what a
 * heart tap does, and the organizer's confirm.
 * Output: the row, with the id "stay-<id>" so the page can bring it into
 * view (case 17). A long name takes two lines, then is cut (case 11). A
 * photo that fails to load gives way to the area's scenery (case 18).
 * Examples (checked at 390 px against 20/4):
 *   → photo, "Cliffside villa with pool", "Uluwatu · sleeps 10 · added by KA", "Open listing", KA TO MB, heart 3
 */
export function StayCard({ id, option, addedBy, hearted, you, onHeart, onConfirm }: StayCardProps) {
  const on = hearted.some((person) => person.id === you);
  const fallback = scenery(idFromName(option.area), option.destination);
  const facts = [option.area, option.sleeps ? `sleeps ${option.sleeps}` : null, `added by ${initials(addedBy)}`].filter(Boolean).join(" · ");
  return (
    <article className="srw" id={`stay-${id}`}>
      <img
        className="photo"
        src={option.photoUrl ?? fallback}
        alt=""
        loading="lazy"
        onError={(event) => {
          if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
        }}
      />
      <div className="body">
        <b>{option.name}</b>
        <p className="cap">{facts}</p>
        <p className="l">
          <a href={option.url} target="_blank" rel="noopener noreferrer">
            Open listing
          </a>
        </p>
        {hearted.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <Avatars people={hearted} you={you} />
          </div>
        )}
        {onConfirm && (
          <button type="button" className="btn sm" onClick={onConfirm}>
            Confirm this stay
          </button>
        )}
      </div>
      <button type="button" className="heart" aria-pressed={on} aria-label={`Heart ${option.name}, ${hearted.length}`} onClick={() => onHeart(!on)}>
        <Icon name="heart" />
        {hearted.length}
      </button>
    </article>
  );
}
