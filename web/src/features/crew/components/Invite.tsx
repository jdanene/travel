import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "../../../components/Icon";
import { Notice } from "../../../components/Notice";
import { Sheet } from "../../../components/Sheet";
import type { WriteFailure } from "../../../lib/db";
import { DEFAULT_INVITE_TITLE, inviteLine, inviteLink, MAX_INVITE_TITLE } from "../../../lib/invite";
import type { TripInfo } from "../../../types/trip";
import { addOrganizerKey, saveInviteTitle } from "../api/invite";
import "./OrganizerSignIn.css";
import "./Invite.css";

/**
 * "Invite": the organizer's quiet link at the foot of the trip page,
 * before "Text the crew", where a friend sees "Organizer sign-in". It opens
 * the one sheet "Invite", top to bottom: the invite title with its live
 * link preview and "Save"; the crew link with "Copy link" and "Share"; then
 * "Add an organizer", which makes a new organizer link for a co-organizer.
 * Friends never see it: the page renders it for an organizer only.
 *
 * Most openings are to hand out the crew link, so the title field does not
 * take focus (a phone's keyboard would cover the link). An organizer link
 * is made only on a tap, one per tap, and shown only in this opening; the
 * keys made before are never shown (no phone can read them).
 *
 * Inputs: the trip and its info (the saved invite title, which the share
 * sheet also carries).
 * Output: the link, and the sheet while it is open.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   organizer opens it            → "Invite title" holds the saved title, then the crew link, then "Add an organizer"
 *   types "Bali 2027", Save       → info/inviteTitle = "Bali 2027"; Save reads "Saved" for 2 seconds; the sheet stays open
 *   taps "Make an organizer link" → a new key is saved; its link shows with its own "Copy link" and "Share"
 *   closes and reopens            → the saved title, no organizer link; "Make an organizer link" again
 *   a friend's page               → no "Invite"; "Organizer sign-in" instead
 */
export function Invite({ tripId, info }: { tripId: string; info: TripInfo | undefined }) {
  const title = info?.inviteTitle ?? DEFAULT_INVITE_TITLE;
  const [open, setOpen] = useState(false);
  // A new key per opening of the sheet: InviteTitle and AddOrganizer start clean each time.
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
        <div className="invite" key={opening}>
          <InviteTitle tripId={tripId} saved={title} />
          <section className="invite-part" aria-labelledby="invite-crew-title">
            <h3 id="invite-crew-title" className="h3">
              Crew link
            </h3>
            <ShareLink link={inviteLink(tripId)} title={title} />
          </section>
          <AddOrganizer tripId={tripId} title={title} />
        </div>
      </Sheet>
    </>
  );
}

/**
 * The sheet's first part: one field with the invite title, a live preview
 * of the link as Messages and WhatsApp show it ("You're invited to “…”. Tap
 * here to access"), and "Save". The preview's picture is the page's own
 * og:image. A saved title reaches link previews at the next deploy
 * (scripts/stamp-preview.mjs); the part says so under the preview.
 *
 * Inputs: the trip, and the saved title the field starts from.
 * Output: the form. A blank title is refused with "Type a title."; the field
 * holds at most 60 characters. A refused write says "This was not saved.",
 * a failed one "No connection". A landed write turns "Save" into "Saved"
 * with a check for 2 seconds.
 * Examples (checked on the emulator):
 *   no title saved → the field holds "Indonesia/Thailand Trip 2027"; the preview reads
 *                    "You’re invited to “Indonesia/Thailand Trip 2027”. Tap here to access"
 *   clears, Save   → "Type a title."; the preview shows “…”
 */
function InviteTitle({ tripId, saved }: { tripId: string; saved: string }) {
  const [draft, setDraft] = useState(saved);
  const [blank, setBlank] = useState(false);
  const [failure, setFailure] = useState<WriteFailure | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  useFlash(done, () => setDone(false));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = draft.trim();
    if (!next) return setBlank(true);
    setSaving(true);
    setFailure(null);
    const result = await saveInviteTitle(tripId, next);
    setSaving(false);
    if (result.ok) setDone(true);
    else setFailure(result.reason);
  };

  const image = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content;

  return (
    <form className="invite-part invite-title-form" onSubmit={(event) => void submit(event)} noValidate>
      <h3 id="invite-title-label" className="h3">
        Invite title
      </h3>
      <label className="field">
        <input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setBlank(false);
            setDone(false);
          }}
          maxLength={MAX_INVITE_TITLE}
          aria-labelledby="invite-title-label"
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
      <p className="cap invite-title-cap">Link preview</p>
      <div className="invite-title-preview">
        {image && <img src={image} alt="" />}
        <p>
          <b>{inviteLine(draft.trim() || "…")}</b>
          <span className="cap">{window.location.hostname}</span>
        </p>
      </div>
      <p className="cap invite-title-note">Shared links show this after the next deploy.</p>
      {failure && <Notice>{failure === "refused" ? "This was not saved." : "No connection"}</Notice>}
      <button type="submit" className="btn sec" disabled={saving} aria-busy={saving}>
        {done && <Icon name="check" />}
        {done ? "Saved" : "Save"}
      </button>
      <span className="sr-only" role="status">
        {done ? "Saved" : ""}
      </span>
    </form>
  );
}

/**
 * The sheet's last part, "Add an organizer": its warning line shows before
 * the tap, so the organizer knows what the link gives away before making it.
 *
 * Inputs: the trip, and the invite title the share sheet carries.
 * Output: "Make an organizer link", then the new link. A refused write says
 * "This was not saved."; a failed one "No connection".
 * Examples (checked on the emulator): tap → a new key in organizerKeys; its link shows
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
    <section className="invite-part" aria-labelledby="invite-organizer-title">
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
  useFlash(copied, () => setCopied(false));

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

/**
 * Ends a 2-second confirmation ("Copied", "Saved"): while on is true, calls
 * off after 2 seconds; a new on restarts the wait.
 * Inputs: on, off. Output: nothing.
 * Examples (checked on screen): "Copy link" → "Copied" → "Copy link" 2 seconds later
 */
function useFlash(on: boolean, off: () => void): void {
  const latest = useRef(off);
  latest.current = off;
  useEffect(() => {
    if (!on) return;
    const timer = setTimeout(() => latest.current(), 2000);
    return () => clearTimeout(timer);
  }, [on]);
}
