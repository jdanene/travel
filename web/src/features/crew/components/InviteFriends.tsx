import { useEffect, useRef, useState } from "react";
import { Icon } from "../../../components/Icon";
import { Notice } from "../../../components/Notice";
import { Sheet } from "../../../components/Sheet";
import type { WriteFailure } from "../../../lib/db";
import { DEFAULT_INVITE_TITLE, inviteLink } from "../../../lib/invite";
import type { TripInfo } from "../../../types/trip";
import { addOrganizerKey } from "../api/invite";
import "./OrganizerSignIn.css";
import "./InviteFriends.css";

/**
 * "Invite friends": the organizer's quiet link at the foot of the trip
 * page, beside "Edit invite", so the organizer hands out links without
 * asking anyone. It opens the sheet "Invite friends": the crew link with
 * "Copy link" and "Share", then "Add an organizer", which makes a new
 * organizer link for a co-organizer. Friends never see it: the page
 * renders it for an organizer only.
 *
 * An organizer link is made only on a tap, one per tap, and shown only in
 * this opening of the sheet; the keys made before are never shown (no
 * phone can read them). Its warning line shows before the tap, so the
 * organizer knows what the link gives away before making it.
 *
 * Inputs: the trip and its info (for the invite title the share sheet carries).
 * Output: the link, and the sheet while it is open. A refused write says
 * "This was not saved."; a failed one "No connection".
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   organizer opens it            → the crew link, "Copy link", "Share" (where the browser has a share sheet)
 *   taps "Copy link"              → the link is on the clipboard; the button reads "Copied" for 2 seconds
 *   taps "Make an organizer link" → a new key is saved; its link shows with its own "Copy link" and "Share"
 *   closes and reopens            → the organizer link is gone; "Make an organizer link" again
 *   a friend's page               → no "Invite friends"
 */
export function InviteFriends({ tripId, info }: { tripId: string; info: TripInfo | undefined }) {
  const title = info?.inviteTitle ?? DEFAULT_INVITE_TITLE;
  const [open, setOpen] = useState(false);
  const [organizerKey, setOrganizerKey] = useState<string | null>(null);
  const [failure, setFailure] = useState<WriteFailure | null>(null);
  const [making, setMaking] = useState(false);

  // Each opening starts clean: a key made earlier is not shown again.
  const start = () => {
    setOrganizerKey(null);
    setFailure(null);
    setOpen(true);
  };

  const make = async () => {
    setMaking(true);
    setFailure(null);
    const result = await addOrganizerKey(tripId);
    setMaking(false);
    if (result.ok) setOrganizerKey(result.key);
    else setFailure(result.reason);
  };

  return (
    <>
      <button type="button" className="organizer-link" onClick={start}>
        Invite friends
      </button>
      <Sheet open={open} title="Invite friends" onClose={() => setOpen(false)}>
        <div className="invite-friends">
          <ShareLink link={inviteLink(tripId)} title={title} />
          <section className="invite-organizer" aria-labelledby="invite-organizer-title">
            <h3 id="invite-organizer-title" className="h3">
              Add an organizer
            </h3>
            <p className="sub">Anyone with this link can confirm dates and stays.</p>
            {organizerKey ? (
              <ShareLink link={inviteLink(tripId, organizerKey)} title={title} />
            ) : (
              <button type="button" className="btn sec" onClick={() => void make()} disabled={making} aria-busy={making}>
                Make an organizer link
              </button>
            )}
            {failure && <Notice>{failure === "refused" ? "This was not saved." : "No connection"}</Notice>}
          </section>
        </div>
      </Sheet>
    </>
  );
}

/**
 * One link to hand out: the link in full, "Copy link", and "Share" where
 * the browser has a share sheet (phones, and Safari and Chrome on a Mac).
 *
 * Inputs: link — what to hand out; title — the invite title, the share
 * sheet's text.
 * Output: the link and its buttons. When the clipboard refuses (an old
 * browser, a page not on https), the link's text is selected instead, so
 * the organizer copies it by hand. A closed share sheet does nothing.
 * Examples (checked on screen):
 *   "Copy link" → "Copied" with a check for 2 seconds; a screen reader hears "Copied"
 *   "Share"     → the phone's share sheet with the invite title and the link
 */
function ShareLink({ link, title }: { link: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const text = useRef<HTMLParagraphElement>(null);
  const canShare = typeof navigator.share === "function";

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      const node = text.current;
      if (node) window.getSelection()?.selectAllChildren(node);
    }
  };

  const share = () => {
    // A closed share sheet rejects; there is nothing to say about it.
    navigator.share({ text: title, url: link }).catch(() => undefined);
  };

  return (
    <div className="share-link">
      <p ref={text} className="share-link-text">
        {link}
      </p>
      <div className={canShare ? "share-link-buttons two" : "share-link-buttons"}>
        <button type="button" className="btn" onClick={() => void copy()}>
          {copied && <Icon name="check" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        {canShare && (
          <button type="button" className="btn sec" onClick={share}>
            Share
          </button>
        )}
      </div>
      <span className="sr-only" role="status">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}
