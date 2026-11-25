import { useRef, useState } from "react";
import { Icon } from "../../../components/Icon";
import { canShare, copyLink, shareLink, useFlash } from "../../../lib/share";

interface ShareButtonProps {
  /** The link to hand out (lib/share.ts eventsLink). */
  url: string;
  /** The line the share sheet carries with the link. */
  text: string;
  /** The button's look: the Events header's quiet pill, or the show sheet's white button. */
  className: string;
}

/**
 * "Share": hands a shared events page's link to friends (owner, 25 Nov
 * 2026: "share all the events to my friends so they can see it", "and a
 * single event"). Where the browser has a share sheet (phones, Safari and
 * Chrome on a Mac) it opens it; else it copies the link and reads "Copied"
 * for 2 seconds. A closed share sheet does nothing. When the clipboard
 * refuses, the link shows under the button, selected, to copy by hand.
 *
 * Inputs: the link, the share sheet's line, the button's class.
 * Output: the button, and the link line after a refused copy.
 * Examples (checked on the emulator at 390 px and 1650 px):
 *   Events, desktop Chrome on localhost → "Copied" with a check; the clipboard holds http://localhost:5192/trip/<id>/events
 *   Peggy Gou's sheet, "Share"          → "Copied"; the clipboard holds …/trip/<id>/events/<showId>
 */
export function ShareButton({ url, text, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [refused, setRefused] = useState(false);
  const line = useRef<HTMLParagraphElement>(null);
  useFlash(copied, () => setCopied(false));

  const go = async () => {
    if (canShare()) return void (await shareLink(url, text));
    if (await copyLink(url)) {
      setRefused(false);
      return setCopied(true);
    }
    setRefused(true);
    requestAnimationFrame(() => line.current && window.getSelection()?.selectAllChildren(line.current));
  };

  return (
    <>
      <button type="button" className={className} onClick={() => void go()}>
        <Icon name={copied ? "check" : "share"} size={18} />
        {copied ? "Copied" : "Share"}
      </button>
      {refused && (
        <p ref={line} className="cap share-fallback">
          {url}
        </p>
      )}
      <span className="share-status" role="status">
        {copied ? "Copied" : ""}
      </span>
    </>
  );
}
