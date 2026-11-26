import { Icon, type IconName } from "../../../components/Icon";
import { Sheet } from "../../../components/Sheet";
import type { Club } from "../lib/club";
import { PhotoCard } from "./PhotoCard";

interface ClubSheetProps {
  /** The club to show; undefined while closed. */
  club?: Club;
  /** Closes the sheet and opens the app's Map on the club; absent on the shared pages and for a club with no pin. */
  onSeeMap?: () => void;
  onClose: () => void;
}

/**
 * The club sheet (owner, 25 Nov 2026: "a modal poop up of w/ a nice pic of
 * the club and its website and insta links plus a link to were it is in
 * google map"; "for in the app it we can link to our own map"), in the
 * shared Sheet.
 * Top to bottom: the club's name, its picture, where it is and its one
 * line, then the ways out. In the app a club with a pin opens our own map
 * ("See on the map", the sheet's one filled button: it stays in the app).
 * The links that leave the app ("Website", "Instagram", and "Google Maps"
 * where there is no map to open) are quiet chips with an icon, the label
 * and an out-arrow, and open in a new tab. A link the club does not have is
 * absent. No faces, names or counts: the shared pages show this sheet too.
 *
 * Inputs: the club (lib/club.ts), what "See on the map" does, and closing.
 * Output: the sheet, or nothing while closed.
 * Examples (checked on the emulator at 390 px and 1650 px):
 *   Savaya in the app → its picture, "Uluwatu, Bali, Indonesia", "Club on the cliffs", "See on the map", "Website", "Instagram"
 *   Savaya on the shared list → the same with "Google Maps" in place of "See on the map"
 *   Eden Garden (no picture, no links) on the shared list → its name, "Haad Yuan, Koh Phangan, Thailand", "Google Maps"
 */
export function ClubSheet({ club, onSeeMap, onClose }: ClubSheetProps) {
  return (
    <Sheet open={club !== undefined} title={club?.name ?? ""} onClose={onClose}>
      {club && <ClubDetail club={club} onSeeMap={onSeeMap} />}
    </Sheet>
  );
}

function ClubDetail({ club, onSeeMap }: { club: Club; onSeeMap?: () => void }) {
  const links: Array<{ href: string; icon: IconName; label: string }> = [
    ...(club.website ? [{ href: club.website, icon: "globe" as const, label: "Website" }] : []),
    ...(club.instagram ? [{ href: club.instagram, icon: "insta" as const, label: "Instagram" }] : []),
    // In the app our own map shows where the club is; Google Maps only where there is none to open.
    ...(onSeeMap ? [] : [{ href: club.maps, icon: "pin" as const, label: "Google Maps" }]),
  ];
  return (
    <div className="club-detail">
      <PhotoCard photos={[club.photoUrl]} className="club-photo" />
      <p className="club-where">
        {club.where}
        {club.line && <span className="sub">{club.line}</span>}
      </p>
      {onSeeMap && (
        <button type="button" className="btn club-map" onClick={onSeeMap}>
          <Icon name="map" size={20} />
          See on the map
        </button>
      )}
      {links.length > 0 && (
        <ul className="club-links">
          {links.map(({ href, icon, label }) => (
            <li key={label}>
              <a className="club-link" href={href} target="_blank" rel="noopener noreferrer">
                <Icon name={icon} size={20} />
                {label}
                <Icon name="out" size={14} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
