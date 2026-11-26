import { Icon, type IconName } from "../../../components/Icon";
import { Sheet } from "../../../components/Sheet";
import type { Club } from "../lib/club";
import { PhotoCard } from "./PhotoCard";

interface ClubSheetProps {
  /** The club to show; undefined while closed. */
  club?: Club;
  onClose: () => void;
}

/**
 * The club sheet of the shared pages (owner, 25 Nov 2026: "a modal poop up
 * of w/ a nice pic of the club and its website and insta links plus a link
 * to were it is in google map"), in the shared Sheet. The app itself does
 * not open it: there a club's heading opens our own Map (owner, 25 Nov
 * 2026: "remove the changes u did ... to thje clubs"; exception 30).
 * Top to bottom: the club's name, its picture, where it is and its one
 * line, then the ways out, "Website", "Instagram" and "Google Maps": quiet
 * chips with an icon, the label and an out-arrow, each in a new tab. A link
 * the club does not have is absent; Google Maps is always there. No faces,
 * names or counts.
 *
 * Inputs: the club (lib/club.ts) and closing.
 * Output: the sheet, or nothing while closed.
 * Examples (checked on the iPhone simulator and the emulator at 390 px and 1650 px):
 *   Savaya on the shared list → its picture, "Uluwatu, Bali, Indonesia", "Club on the cliffs", "Website", "Instagram", "Google Maps"
 *   Eden Garden (no picture, no links) on the shared list → its name, "Haad Yuan, Koh Phangan, Thailand", "Google Maps"
 */
export function ClubSheet({ club, onClose }: ClubSheetProps) {
  return (
    <Sheet open={club !== undefined} title={club?.name ?? ""} onClose={onClose}>
      {club && <ClubDetail club={club} />}
    </Sheet>
  );
}

function ClubDetail({ club }: { club: Club }) {
  const links: Array<{ href: string; icon: IconName; label: string }> = [
    ...(club.website ? [{ href: club.website, icon: "globe" as const, label: "Website" }] : []),
    ...(club.instagram ? [{ href: club.instagram, icon: "insta" as const, label: "Instagram" }] : []),
    { href: club.maps, icon: "pin" as const, label: "Google Maps" },
  ];
  return (
    <div className="club-detail">
      <PhotoCard photos={[club.photoUrl]} className="club-photo" />
      <p className="club-where">
        {club.where}
        {club.line && <span className="sub">{club.line}</span>}
      </p>
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
    </div>
  );
}
