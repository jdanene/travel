import { useState, type FormEvent } from "react";
import { Notice } from "../../../components/Notice";
import { Sheet } from "../../../components/Sheet";
import type { WriteFailure } from "../../../lib/db";
import { DEFAULT_INVITE_TITLE, inviteLine, MAX_INVITE_TITLE } from "../../../lib/invite";
import type { TripInfo } from "../../../types/trip";
import { saveInviteTitle } from "../api/invite";
import "./OrganizerSignIn.css";
import "./EditInvite.css";

/**
 * "Edit invite": the organizer's quiet text link at the foot of the trip
 * page, after "Invite friends" and before "Text the crew", where a friend sees "Organizer sign-in". It opens the sheet "Invite
 * title": one field with the title, a live preview of the link as Messages
 * and WhatsApp show it ("You're invited to “…”. Tap here to access"), and
 * Save. Friends never see it: the page renders it for an organizer only.
 *
 * The preview's picture is the page's own og:image, so the sheet shows the
 * picture the deploy serves. A saved title reaches link previews at the
 * next deploy (scripts/stamp-preview.mjs); the sheet says so under the
 * preview.
 *
 * Inputs: the trip and its info (for the saved title).
 * Output: the link, and the sheet while it is open. A blank title is
 * refused with "Type a title." under the field; the field holds at most 60
 * characters. A refused write says "This was not saved."; a failed one
 * "No connection". Save closes the sheet once the write lands.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   organizer, no title saved    → the field holds "Indonesia/Thailand Trip 2027"; the preview reads
 *                                  "You’re invited to “Indonesia/Thailand Trip 2027”. Tap here to access"
 *   types "Bali 2027", Save      → info/inviteTitle = "Bali 2027"; the sheet closes; reopened, it holds "Bali 2027"
 *   clears the field, Save       → "Type a title."; the preview shows “…”
 *   a friend's page              → no "Edit invite"; "Organizer sign-in" instead
 */
export function EditInvite({ tripId, info }: { tripId: string; info: TripInfo | undefined }) {
  const saved = info?.inviteTitle ?? DEFAULT_INVITE_TITLE;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(saved);
  const [blank, setBlank] = useState(false);
  const [failure, setFailure] = useState<WriteFailure | null>(null);
  const [saving, setSaving] = useState(false);

  // Each opening starts from the saved title, so a draft left unsaved is not mistaken for the live one.
  const start = () => {
    setDraft(saved);
    setBlank(false);
    setFailure(null);
    setOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return setBlank(true);
    setSaving(true);
    setFailure(null);
    const result = await saveInviteTitle(tripId, title);
    setSaving(false);
    if (result.ok) setOpen(false);
    else setFailure(result.reason);
  };

  const image = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content;

  return (
    <>
      <button type="button" className="organizer-link" onClick={start}>
        Edit invite
      </button>
      <Sheet open={open} title="Invite title" onClose={() => setOpen(false)}>
        <form className="invite-title-form" onSubmit={(event) => void submit(event)} noValidate>
          <label className="field">
            <input
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setBlank(false);
              }}
              maxLength={MAX_INVITE_TITLE}
              aria-labelledby="sheet-title"
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
          <button type="submit" className="btn" disabled={saving} aria-busy={saving}>
            Save
          </button>
        </form>
      </Sheet>
    </>
  );
}
