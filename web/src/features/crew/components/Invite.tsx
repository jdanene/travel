import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "../../../components/Icon";
import { Notice } from "../../../components/Notice";
import { Sheet } from "../../../components/Sheet";
import type { WriteFailure } from "../../../lib/db";
import { canShare as browserCanShare, copyLink, shareLink, useFlash } from "../../../lib/share";
import { DEFAULT_INVITE_TITLE, inviteLine, inviteLink, MAX_INVITE_TITLE, SITE } from "../../../lib/invite";
import type { TripInfo } from "../../../types/trip";
import { addOrganizerKey, saveInviteTitle } from "../api/invite";
import "./OrganizerSignIn.css";
import "./Invite.css";

/**
 * "Invite": the organizer's quiet link at the foot of the trip page,
 * before "Text the crew", where a friend sees "Organizer sign-in". It opens
 * the one sheet "Invite", one column, top to bottom: the crew link's preview
 * as friends will see it in Messages (with "Edit title"), then "Copy link"
 * and "Share" with the link itself under them; after a hairline, the quiet
 * "Add an organizer", which makes a new organizer link for a co-organizer.
 * Friends never see it: the page renders it for an organizer only.
 *
 * Most openings are to send the crew link, so nothing takes focus but
 * Close, and the title is edited only on a tap of "Edit title". An
 * organizer link is made only on a tap, one per tap, and shown only in this
 * opening; the keys made before are never shown (no phone can read them).
 *
 * Inputs: the trip and its info (the saved invite title, which the share
 * sheet also carries).
 * Output: the link, and the sheet while it is open.
 * Examples (checked by eye at 375, 768 and 1650 px):
 *   organizer opens it            → the preview card, "Copy link" and "Share", the link on one line, then "Add an organizer"
 *   "Edit title", "Bali 2027", Save → info/inviteTitle = "Bali 2027"; the card reads it; "Saved" for 2 seconds
 *   taps "Make an organizer link" → a new key is saved; its link shows with its own "Copy link" and "Share"
 *   closes and reopens            → the saved title, no organizer link; "Make an organizer link" again
 *   a friend's page               → no "Invite"; "Organizer sign-in" instead
 */
export function Invite({ tripId, info }: { tripId: string; info: TripInfo | undefined }) {
  const title = info?.inviteTitle ?? DEFAULT_INVITE_TITLE;
  const [open, setOpen] = useState(false);
  // A new key per opening of the sheet: every part starts clean each time.
  const [opening, setOpening] = useState(0);

  const start = () => {
    setOpening((count) => count + 1);
    setOpen(true);
  };

  return (
    <>
      <button type="button" className="organizer-link" onClick={start}>
        Invite
      </button>
      <Sheet open={open} title="Invite" onClose={() => setOpen(false)} focusFirst={false}>
        <div className="invite-sheet" key={opening}>
          <section aria-label="Crew link">
            <InvitePreview tripId={tripId} saved={title} />
            <ShareLink link={inviteLink(tripId)} title={title} />
          </section>
          <AddOrganizer tripId={tripId} title={title} />
        </div>
      </Sheet>
    </>
  );
}

/**
 * The crew link as Messages shows it: the preview picture across the top
 * (the page's own og:image, 1200 × 630), the line "You're invited to “…”.
 * Tap here to access" on at most two lines, and the site in small grey.
 * "Edit title" turns the line into a field with "Save" and "Cancel"; the
 * card shows the line as typed. A saved title reaches link previews at the
 * next deploy (scripts/stamp-preview.mjs); the grey line under the card
 * says so.
 *
 * Inputs: the trip, and the saved title.
 * Output: the card. A blank title is refused with "Type a title."; the field
 * holds at most 60 characters. A refused write says "This was not saved.",
 * a failed one "No connection", and the field stays open with the text. A
 * landed write closes the field and shows "Saved" with a check for 2 seconds.
 * Examples (checked by eye):
 *   no title saved → "You’re invited to “Indonesia/Thailand Trip 2027”. Tap here to access"
 *   Edit title, clear, Save → "Type a title."; the field stays open
 *   Edit title, Cancel → the saved line again; focus back on "Edit title"
 */
function InvitePreview({ tripId, saved }: { tripId: string; saved: string }) {
  // The title just saved here, until the trip brings it back as saved.
  const [pending, setPending] = useState<string | null>(null);
  const shown = pending ?? saved;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(saved);
  const [blank, setBlank] = useState(false);
  const [failure, setFailure] = useState<WriteFailure | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const edit = useRef<HTMLButtonElement>(null);
  useFlash(done, () => setDone(false));

  useEffect(() => setPending(null), [saved]);

  const startEdit = () => {
    setDraft(shown);
    setBlank(false);
    setFailure(null);
    setDone(false);
    setEditing(true);
  };
  useEffect(() => {
    if (editing) field.current?.focus();
  }, [editing]);

  const stopEdit = () => {
    setEditing(false);
    setBlank(false);
    setFailure(null);
    requestAnimationFrame(() => edit.current?.focus());
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = draft.trim();
    if (!next) return setBlank(true);
    setSaving(true);
    setFailure(null);
    const result = await saveInviteTitle(tripId, next);
    setSaving(false);
    if (!result.ok) return setFailure(result.reason);
    setPending(next);
    setDone(true);
    stopEdit();
  };

  const image = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content ?? "/og2.jpg";
  const line = inviteLine((editing ? draft.trim() : shown) || "…");

  return (
    <>
      <div className="invite-card">
        <img src={image} alt="" width={1200} height={630} />
        <div className="invite-card-body">
          <p className="invite-card-line">{line}</p>
          {editing ? (
            <form className="invite-card-edit" onSubmit={(event) => void submit(event)} noValidate>
              <label className="field">
                <small>Invite title</small>
                <input
                  ref={field}
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setBlank(false);
                  }}
                  maxLength={MAX_INVITE_TITLE}
                  aria-invalid={blank}
                  aria-describedby={blank ? "invite-title-blank" : undefined}
                  autoComplete="off"
                  enterKeyHint="done"
                />
              </label>
              {blank && (
                <p id="invite-title-blank" className="field-error" role="alert">
                  Type a title.
                </p>
              )}
              {failure && <Notice>{failure === "refused" ? "This was not saved." : "No connection"}</Notice>}
              <div className="invite-pair">
                <button type="button" className="btn sec" onClick={stopEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={saving} aria-busy={saving}>
                  Save
                </button>
              </div>
            </form>
          ) : (
            <div className="invite-card-foot">
              <span className="cap">{new URL(SITE).hostname}</span>
              <button ref={edit} type="button" className="invite-card-editbtn" onClick={startEdit}>
                {done && <Icon name="check" />}
                {done ? "Saved" : "Edit title"}
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="cap invite-sheet-note">Shared links show a new title after the next deploy.</p>
      <span className="sr-only" role="status">
        {done ? "Saved" : ""}
      </span>
    </>
  );
}

/**
 * The sheet's last part, "Add an organizer", set apart below a hairline:
 * its warning line shows before the tap, so the organizer knows what the
 * link gives away before making it.
 *
 * Inputs: the trip, and the invite title the share sheet carries.
 * Output: "Make an organizer link", then the new link with "Copy link" and
 * "Share". A refused write says "This was not saved."; a failed one "No connection".
 * Examples (checked by eye): tap → a new key in organizerKeys; its link shows
 */
function AddOrganizer({ tripId, title }: { tripId: string; title: string }) {
  const [organizerKey, setOrganizerKey] = useState<string | null>(null);
  const [failure, setFailure] = useState<WriteFailure | null>(null);
  const [making, setMaking] = useState(false);

  const make = async () => {
    setMaking(true);
    setFailure(null);
    const result = await addOrganizerKey(tripId);
    setMaking(false);
    if (result.ok) setOrganizerKey(result.key);
    else setFailure(result.reason);
  };

  return (
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
  );
}

/**
 * One link to hand out: "Copy link" and "Share" side by side, equal width
 * ("Share" only where the browser has a share sheet: phones, and Safari and
 * Chrome on a Mac), then the link itself on one small grey line, cut in
 * the middle so its start and its end both show.
 *
 * Inputs: link — what to hand out; title — the invite title, the share
 * sheet's text.
 * Output: the buttons and the link. When the clipboard refuses (an old
 * browser, a page not on https), the link's text is selected instead, so
 * the organizer copies it by hand. A closed share sheet does nothing.
 * Examples (checked by eye):
 *   "Copy link" → "Copied" with a check for 2 seconds; a screen reader hears "Copied"
 *   "Share"     → the phone's share sheet with the invite title and the link
 *   the link    → "https://travel-ca8f9.web.app/?…&organizer=K1" on one line
 */
function ShareLink({ link, title }: { link: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const text = useRef<HTMLParagraphElement>(null);
  const canShare = browserCanShare();
  useFlash(copied, () => setCopied(false));

  const copy = async () => {
    if (await copyLink(link)) return setCopied(true);
    const node = text.current;
    if (node) window.getSelection()?.selectAllChildren(node);
  };

  // A closed share sheet ends quietly; there is nothing to say about it.
  const share = () => void shareLink(link, title);

  // The last 12 characters never shrink, so the cut falls in the middle.
  const tail = link.slice(-12);
  return (
    <div className="share-link">
      <div className={canShare ? "invite-pair" : "invite-pair one"}>
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
      <p ref={text} className="share-link-text" title={link}>
        <span className="share-link-head">{link.slice(0, -12)}</span>
        <span className="share-link-tail">{tail}</span>
      </p>
      <span className="sr-only" role="status">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}
