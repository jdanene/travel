import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Sheet } from "../../../components/Sheet";
import { Notice } from "../../../components/Notice";
import { Icon } from "../../../components/Icon";
import { Face } from "../../../components/Avatars";
import type { WriteFailure, WriteResult } from "../../../lib/db";
import type { Member, MemberId } from "../../../types/trip";
import { savePhoto } from "../api/photo";
import { readPhone, savePhone } from "../api/phone";
import { PhotoField } from "../../../components/PhotoField";
import { PhoneField } from "./PhoneField";
import { DEFAULT_COUNTRY, countryOf, showPhone, toE164 } from "../lib/phone";
import "./PhotoSheet.css";

/** How long a number write may wait before the sheet says it has no connection; the write still lands later. */
const SLOW_MS = 5000;

interface PhotoSheetProps {
  open: boolean;
  tripId: string;
  memberId: MemberId;
  member: Member;
  onClose: () => void;
}

/**
 * "You": the sheet a joined friend opens by tapping their own face on the
 * flyer. On top is the same face as on the page, large: the photo, or the
 * initials in the friend's own crew colour. Under it are their name and the
 * photo action ("Add a photo", black, or "Change photo" and "Remove
 * photo"). Below a line is the optional phone for trip texts. A photo
 * change saves at once; the circles across the page follow when the write
 * lands. Focus starts on Close, so a tap draws no ring and nothing opens
 * the keyboard.
 *
 * Inputs: whether it is open, the trip, this device's member and their
 * record, and what closing does.
 * Output: the sheet. A refused write says "This was not saved."; with no
 * connection the change waits and lands later, and the sheet says "No
 * connection" if the SDK gives up. Of two quick photo changes, only the
 * last one's result shows, and closing the sheet clears it.
 * Examples (checked on the emulator at 390 px and 1650 px):
 *   KA with no photo, orange on the page → an orange "KA" circle, "KA" under it, a black "Add a photo"
 *   pick a photo     → the circle shows it, "Change photo" and "Remove photo"; KA's circles on the page change too
 *   "Remove photo"   → back to the orange "KA"
 */
export function PhotoSheet({ open, tripId, memberId, member, onClose }: PhotoSheetProps) {
  const [failure, setFailure] = useState<WriteResult | null>(null);
  const latest = useRef(0);

  // The SDK shows the change at once and sends it when it can; only a refusal or a failure comes back.
  const change = (photo: string | null) => {
    const mine = ++latest.current;
    setFailure(null);
    void savePhoto(tripId, memberId, photo).then((result) => {
      if (mine === latest.current) setFailure(result.ok ? null : result);
    });
  };

  // The sheet stays mounted while closed, so an old photo failure must not greet the next opening.
  const close = () => {
    latest.current++;
    setFailure(null);
    onClose();
  };

  return (
    <Sheet open={open} title="You" onClose={close} focusFirst={false}>
      <div className="you-sheet">
        <div className="you-who">
          <span className="you-face" aria-hidden="true">
            <Face person={{ id: memberId, name: member.name }} className="you-big" />
          </span>
          <p className="you-name">{member.name}</p>
          <PhotoField photo={member.photo ?? null} onChange={change} main />
          {failure && !failure.ok && <Notice>{failure.reason === "refused" ? "This was not saved." : "No connection"}</Notice>}
        </div>
        {open && <YourPhone tripId={tripId} memberId={memberId} />}
      </div>
    </Sheet>
  );
}

/**
 * The phone part of "You". Its heading names it ("Phone for trip texts
 * (optional)", or "Phone for trip texts" once saved) and the STOP line sits
 * under the heading, so the promise is read before the number is given.
 * It reads the saved number each time the sheet opens, then shows it as
 * saved (a check, the number, "Saved") with "Change number" and "Remove
 * number", or the field with a black "Save number".
 *
 * "Save number" is never greyed out: an empty or unreadable number answers
 * "Check the number." under the field, and nothing is saved. While a save
 * is out the buttons wait; after five seconds without an answer the sheet
 * says "No connection", and the write still lands when the connection is
 * back. Focus follows the change: to "Change number" after a save, to the
 * field on "Change number", to the heading after a remove.
 *
 * Inputs: the trip and this device's member.
 * Output: the phone section. While reading, a grey block the field's size;
 * if the read fails, "Could not load your number." with "Try again", and no
 * field, so a saved number is not hidden behind an empty one.
 * Examples (checked on the emulator at 390 px and 1650 px):
 *   no number          → the heading, the STOP line, "+1" with "(415) 555-0123" in grey, "Save number"
 *   Save, empty        → "Check the number."
 *   "4155550123", Save → "+1 (415) 555-0123  Saved", "Change number", "Remove number"
 *   "Change number"    → the field, on the saved number's country, with "Save number" and "Cancel"
 *   "Remove number"    → the empty field again
 */
function YourPhone({ tripId, memberId }: { tripId: string; memberId: MemberId }) {
  const [saved, setSaved] = useState<string | null | undefined>(undefined);
  const [readFailed, setReadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState(false);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<WriteFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const changeButton = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<"heading" | "field" | "change" | null>(null);

  useEffect(() => {
    let live = true;
    void readPhone(tripId, memberId).then((result) => {
      if (!live) return;
      if (result.ok) setSaved(result.value?.e164 ?? null);
      else setReadFailed(true);
    });
    return () => {
      live = false;
    };
  }, [tripId, memberId, attempt]);

  // After a change of state, focus goes where the next step is; the element it was on may be gone.
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === "heading") heading.current?.focus();
    if (target === "field") field.current?.focus();
    if (target === "change") changeButton.current?.focus();
  });

  const retry = () => {
    setReadFailed(false);
    setSaved(undefined);
    setAttempt((n) => n + 1);
    focusNext.current = "heading";
  };

  const store = async (e164: string | null) => {
    setBusy(true);
    setFailure(null);
    const timer = window.setTimeout(() => setSlow(true), SLOW_MS);
    const result = await savePhone(tripId, memberId, e164);
    window.clearTimeout(timer);
    setBusy(false);
    setSlow(false);
    if (!result.ok) return setFailure(result.reason);
    setSaved(e164);
    setEditing(false);
    setTyped("");
    focusNext.current = e164 ? "change" : "heading";
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const e164 = toE164(country, typed);
    if (!e164) {
      setError("Check the number.");
      field.current?.focus();
      return;
    }
    setError(null);
    void store(e164);
  };

  const startChange = () => {
    if (saved) setCountry(countryOf(saved));
    setFailure(null);
    setEditing(true);
    focusNext.current = "field";
  };

  const cancel = () => {
    setEditing(false);
    setTyped("");
    setError(null);
    focusNext.current = "change";
  };

  const showSaved = Boolean(saved) && !editing;

  return (
    <section className="you-phone" aria-labelledby={`${id}-heading`}>
      <div className="you-phone-head">
        <h3 id={`${id}-heading`} className="you-sect" tabIndex={-1} ref={heading}>
          {saved ? "Phone for trip texts" : "Phone for trip texts (optional)"}
        </h3>
        <p id={`${id}-note`} className="cap">
          Only trip updates from the organizer. Reply STOP to stop.
        </p>
      </div>
      {readFailed ? (
        <Notice onRetry={retry}>Could not load your number.</Notice>
      ) : saved === undefined ? (
        <div className="you-phone-wait" aria-busy="true" />
      ) : showSaved ? (
        <>
          <p id={`${id}-saved`} className="you-phone-saved">
            <Icon name="check" size={18} />
            <b>{showPhone(saved as string)}</b>
            <span>Saved</span>
          </p>
          <div className="pills">
            <button type="button" className="pill" ref={changeButton} onClick={startChange} disabled={busy} aria-describedby={`${id}-saved`}>
              Change number
            </button>
            <button type="button" className="pill" onClick={() => void store(null)} disabled={busy} aria-busy={busy}>
              Remove number
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <PhoneField
            country={country}
            typed={typed}
            onCountry={(code) => {
              setCountry(code);
              setError(null);
            }}
            onTyped={(value) => {
              setTyped(value);
              setError(null);
            }}
            error={error}
            outside={{ label: `${id}-heading`, note: `${id}-note` }}
            inputRef={field}
          />
          <div className="pills">
            <button type="submit" className="pill pill-main" disabled={busy} aria-busy={busy}>
              Save number
            </button>
            {editing && (
              <button type="button" className="pill" onClick={cancel} disabled={busy}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
      {failure && <Notice>{failure === "refused" ? "This was not saved." : "No connection"}</Notice>}
      {slow && !failure && <Notice>No connection</Notice>}
    </section>
  );
}
