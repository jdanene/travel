import { useState, type ReactNode } from "react";

/**
 * A wide picture at a fixed shape, so nothing moves while it loads: the
 * shared event page's card (EventCard) and the club sheet's picture. The
 * picture loads lazily and sends no referrer (as VenueIcon does): the
 * picture stays on the club's own site. One that fails to load gives way to
 * the next; with none left the card draws only its children, and with no
 * children it draws nothing, so a club with no picture, or one its site
 * moved, has no broken-image box.
 *
 * Inputs: photos — the pictures in order of preference, https only, any of
 * them absent; className — the card's own class; children — what sits over
 * the picture (the event card's name), if anything.
 * Output: the card, or nothing.
 * Examples (checked on the emulator at 390 px and 1650 px):
 *   the event's flyer, then Savaya's picture → the flyer; a flyer that answers 404 → Savaya's picture
 *   a club whose picture answers 404, no children → nothing
 */
export function PhotoCard({ photos, className, children }: { photos: Array<string | undefined>; className: string; children?: ReactNode }) {
  const [failed, setFailed] = useState<string[]>([]);
  const shown = photos.find((photo): photo is string => !!photo?.startsWith("https://") && !failed.includes(photo)) ?? null;
  if (!shown && !children) return null;
  return (
    <div className={`${className}${shown ? " has-photo" : ""}`}>
      {shown && <img key={shown} src={shown} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed((was) => [...was, shown])} />}
      {children}
    </div>
  );
}
