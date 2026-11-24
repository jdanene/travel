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
 * One stay option, as an Airbnb-style card (exception 10): a large photo
 * with rounded corners and the heart with its count over the photo's
 * corner; then the name, one line of facts, "Open listing" with who hearted
 * it, and, for the organizer, a full-width "Confirm this stay". The words
 * and the order are those of 20/4 and 20/6.
 *
 * Inputs: the option, who added it, who hearted it, this member, what a
 * heart tap does, and the organizer's confirm.
 * Output: the card, with the id "stay-<id>" so the page can bring it into
 * view (case 17). A long name takes two lines, then is cut (case 11); the
 * facts take one line. A photo that fails to load gives way to the area's
 * scenery (case 18). The module lays cards one per row on a phone and two
 * per row in the desktop column.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   → photo with heart 3 on its corner, "Cliffside villa with pool", "Uluwatu · sleeps 10 · added by KA", "Open listing" and KA TO MB
 *   organizer, stay open → the same, with "Confirm this stay" across the card on one line
 */
export function StayCard({ id, option, addedBy, hearted, you, onHeart, onConfirm }: StayCardProps) {
  const on = hearted.some((person) => person.id === you);
  const fallback = scenery(idFromName(option.area), option.destination);
  const facts = [option.area, option.sleeps ? `sleeps ${option.sleeps}` : null, `added by ${initials(addedBy)}`].filter(Boolean).join(" · ");
  return (
    <article className="srw" id={`stay-${id}`}>
      <div className="srw-photo">
        <img
          className="photo"
          src={option.photoUrl ?? fallback}
          alt=""
          loading="lazy"
          onError={(event) => {
            if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
          }}
        />
        <button type="button" className="heart" aria-pressed={on} aria-label={`Heart ${option.name}, ${hearted.length}`} onClick={() => onHeart(!on)}>
          <Icon name="heart" />
          {hearted.length}
        </button>
      </div>
      <b>{option.name}</b>
      <p className="cap facts">{facts}</p>
      <div className="l">
        <a href={option.url} target="_blank" rel="noopener noreferrer">
          Open listing
        </a>
        <Avatars people={hearted} you={you} />
      </div>
      {onConfirm && (
        <button type="button" className="btn sm" onClick={onConfirm}>
          Confirm this stay
        </button>
      )}
    </article>
  );
}
