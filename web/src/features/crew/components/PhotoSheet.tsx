import { useEffect, useState, type FormEvent } from "react";
import { Sheet } from "../../../components/Sheet";
import { Notice } from "../../../components/Notice";
import { initials } from "../../../lib/initials";
import type { WriteFailure, WriteResult } from "../../../lib/db";
import type { Member, MemberId } from "../../../types/trip";
import { savePhoto } from "../api/photo";
import { readPhone, savePhone } from "../api/phone";
import { PhotoField } from "../../../components/PhotoField";
import { PhoneField } from "./PhoneField";
import { DEFAULT_COUNTRY, showPhone, toE164 } from "../lib/phone";

interface PhotoSheetProps {
  open: boolean;
  tripId: string;
  memberId: MemberId;
  member: Member;
  onClose: () => void;
}

/**
 * "You": the sheet a joined friend opens by tapping their own face on the
 * flyer. It shows the photo (or the initials) large, with "Change photo"
 * and "Remove photo", and under it the optional phone for trip texts. A
 * photo change saves at once; the circles across the page follow when the
 * write lands.
 *
 * Inputs: whether it is open, the trip, this device's member and their
 * record, and what closing does.
 * Output: the sheet. A refused write says "This was not saved."; with no
 * connection the change waits and lands later, and the sheet says "No
 * connection" if the SDK gives up.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   RB with no photo → "RB" in a large circle and "Add a photo"
 *   pick a photo     → the circle shows it; RB's circles in Dates and Parties change too
 *   "Remove photo"   → back to "RB"
 *   no number saved  → the phone field and "Save number"; a saved one shows "+1 (415) 555-0123" with "Change number" and "Remove number"
 */
export function PhotoSheet({ open, tripId, memberId, member, onClose }: PhotoSheetProps) {
  const [failure, setFailure] = useState<WriteResult | null>(null);

  // The SDK shows the change at once and sends it when it can; only a refusal or a failure comes back.
  const change = (photo: string | null) => {
    setFailure(null);
    void savePhoto(tripId, memberId, photo).then((result) => setFailure(result.ok ? null : result));
  };

  return (
    <Sheet open={open} title="You" onClose={onClose}>
      <div className="photo-sheet">
        <span className="photo-big" aria-hidden="true">
          {member.photo ? <img src={member.photo} alt="" /> : initials(member.name)}
        </span>
        {failure && !failure.ok && <Notice>{failure.reason === "refused" ? "This was not saved." : "No connection"}</Notice>}
        <PhotoField photo={member.photo ?? null} onChange={change} />
        {open && <YourPhone tripId={tripId} memberId={memberId} />}
      </div>
    </Sheet>
  );
}

/**
 * The phone part of "You": it reads the saved number when the sheet opens,
 * then shows it with "Change number" and "Remove number", or the field with
 * "Save number". Each opening reads again, so a number saved on another
 * phone shows.
 *
 * Inputs: the trip and this device's member.
 * Output: the phone section. A number toE164() cannot read says "Check the
 * number." and saves nothing.
 * Examples (checked on the emulator): see PhotoSheet.
 */
function YourPhone({ tripId, memberId }: { tripId: string; memberId: MemberId }) {
  const [saved, setSaved] = useState<string | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<WriteFailure | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void readPhone(tripId, memberId).then((result) => {
      if (!live) return;
      if (result.ok) setSaved(result.value?.e164 ?? null);
      else {
        setSaved(null);
        setFailure(result.reason);
      }
    });
    return () => {
      live = false;
    };
  }, [tripId, memberId]);

  const store = async (e164: string | null) => {
    setBusy(true);
    setFailure(null);
    const result = await savePhone(tripId, memberId, e164);
    setBusy(false);
    if (!result.ok) return setFailure(result.reason);
    setSaved(e164);
    setEditing(false);
    setTyped("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const e164 = toE164(country, typed);
    if (!e164) return setError("Check the number.");
    setError(null);
    void store(e164);
  };

  if (saved === undefined) return <div className="you-phone" aria-busy="true" />;

  return (
    <div className="you-phone">
      {failure && <Notice>{failure === "refused" ? "This was not saved." : "No connection"}</Notice>}
      {saved && !editing ? (
        <>
          <p className="you-phone-line">
            <small>Phone for trip texts</small>
            <b>{showPhone(saved)}</b>
          </p>
          <div className="pills">
            <button type="button" className="pill" onClick={() => setEditing(true)} disabled={busy}>
              Change number
            </button>
            <button type="button" className="pill" onClick={() => void store(null)} disabled={busy} aria-busy={busy}>
              Remove number
            </button>
          </div>
          <p className="cap phone-note">Only trip updates from the organizer. Reply STOP to stop.</p>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <PhoneField
            country={country}
            typed={typed}
            onCountry={setCountry}
            onTyped={(value) => {
              setTyped(value);
              setError(null);
            }}
            error={error}
          />
          <div className="pills">
            <button type="submit" className="pill pill-main" disabled={busy || typed.trim() === ""} aria-busy={busy}>
              Save number
            </button>
            {editing && (
              <button type="button" className="pill" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
