import { useState } from "react";
import { initials } from "../../../lib/initials";
import type { LinkItem } from "../../../types/trip";
import { siteName } from "../lib/links";

interface LinkCardProps {
  id: string;
  item: LinkItem;
  addedBy: string;
  /** Shown to the friend who added it and to an organizer. */
  onRemove?: () => void;
  onEdit?: () => void;
}

/**
 * One saved link: the thumbnail or the site's name, the note or the title,
 * and "added by KA". A tap opens the link in a new tab.
 *
 * Inputs: the link, who added it, and the remove action when allowed.
 * Output: the row; with no note and no title the text is the address. It has the id "link-<id>" so the page can bring it into
 * view (case 45). A thumbnail that fails to load gives way to the site's
 * name (case 47).
 * Examples (checked at 390 px): a TikTok with a cover → the cover, its caption, "added by RB", "Remove"
 */
export function LinkCard({ id, item, addedBy, onRemove, onEdit }: LinkCardProps) {
  const [broken, setBroken] = useState(false);
  const site = siteName(item);
  const text = item.note ?? item.title ?? item.url.replace(/^https:\/\/(www\.)?/, "");
  return (
    <article className="lrow" id={`link-${id}`}>
      <a className="lopen" href={item.url} target="_blank" rel="noopener noreferrer">
        {item.thumbUrl && !broken ? (
          <img className="thumb" src={item.thumbUrl} alt="" loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <span className="thumb" aria-hidden="true">
            {site}
          </span>
        )}
        <span className="text">
          <b>{text}</b>
          <span className="cap">
            {site} · added by {initials(addedBy)}
          </span>
        </span>
      </a>
      {onEdit && (
        <button type="button" className="remove" onClick={onEdit} aria-label={`Edit ${text}`}>
          Edit
        </button>
      )}
      {onRemove && (
        <button type="button" className="remove" onClick={onRemove} aria-label={`Remove ${text}`}>
          Remove
        </button>
      )}
    </article>
  );
}
