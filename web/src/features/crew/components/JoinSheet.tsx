import { useState, type FormEvent } from "react";
import { Sheet } from "../../../components/Sheet";
import { idFromName } from "../../../lib/ids";
import type { Reply } from "../../../types/trip";
import type { CrewView, Person } from "../api/crew";
import { notReplied, REPLIES } from "../lib/crew";
import { PhotoField } from "../../../components/PhotoField";
import { PhoneField } from "./PhoneField";
import { DEFAULT_COUNTRY, toE164 } from "../lib/phone";

/** The longest name the rules accept. */
const MAX_NAME = 24;

interface JoinSheetProps {
  /** The reply tapped; the sheet is open while it is set. */
  reply: Reply | null;
  crew: CrewView;
  onClose: () => void;
  /** The friend picked, the photo they added, if any, and their phone for trip texts in E.164, if any. */
  onPick: (person: Person, photo: string | null, phone: string | null) => void;
}

/**
 * "Who are you?": the sheet a friend sees after tapping a reply for the
 * first time. One tap on a listed name answers it; a name not on the list
 * is typed once. Names already taken sit under "Already replied", so a
 * friend on a second phone can pick their own name again (case 4).
 *
 * Under the name, "Add a photo" opens the phone's picker, and "Phone for
 * trip texts (optional)" takes a number; both join with whichever name is
 * picked or typed. A number that cannot be read stops the join with
 * "Check the number." under the field, so it is never dropped unseen.
 *
 * Inputs: the reply tapped, the crew view, closing, and what a pick does.
 * Output: the sheet. A typed name is trimmed; an empty one or one over 24
 * characters is refused with the reason under the field; one equal to a
 * listed name joins as that friend (case 6).
 * Examples (checked on the emulator):
 *   expected RJ and LC, nobody else  → two name buttons, the field, and the reply as the main button
 *   typed "  lc "                    → joins as the listed "LC"
 *   a photo added, then "RB" typed   → joins as RB with the photo
 *   "(415) 555-0123", then "RB"      → joins as RB; phones/rb = { e164: "+14155550123", … }
 *   "555-0123", then a name          → "Check the number."; nobody joins
 */
export function JoinSheet({ reply, crew, onClose, onPick }: JoinSheetProps) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [typedPhone, setTypedPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const open = notReplied(crew.expected, crew.byId);
  const label = REPLIES.find((choice) => choice.reply === reply)?.label ?? "";

  const close = () => {
    setTyped("");
    setError(null);
    setPhoto(null);
    setTypedPhone("");
    setPhoneError(null);
    onClose();
  };

  // Returns false when a typed number cannot be read, so the caller stops.
  const pick = (person: Person): boolean => {
    const phone = typedPhone.trim() ? toE164(country, typedPhone) : null;
    if (typedPhone.trim() && !phone) {
      setPhoneError("Check the number.");
      return false;
    }
    setPhoto(null);
    setTypedPhone("");
    setPhoneError(null);
    onPick(person, photo, phone);
    return true;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = typed.trim();
    if (name.length === 0) return setError("Type your name.");
    if (name.length > MAX_NAME) return setError(`Use ${MAX_NAME} characters or fewer.`);
    const id = idFromName(name);
    setError(null);
    if (pick({ id, name: crew.expected[id] ?? crew.byId[id]?.name ?? name })) setTyped("");
  };

  return (
    <Sheet open={reply !== null} title="Who are you?" onClose={close}>
      {open.length > 0 && (
        <div className="pills" style={{ margin: "12px 0 4px" }}>
          {open.map((person) => (
            <button key={person.id} type="button" className="pill" onClick={() => pick(person)}>
              {person.name}
            </button>
          ))}
        </div>
      )}
      {crew.members.length > 0 && (
        <>
          <p className="sect">Already replied</p>
          <div className="pills">
            {crew.members.map((member) => (
              <button key={member.id} type="button" className="pill" onClick={() => pick({ id: member.id, name: member.name })}>
                {member.name}
              </button>
            ))}
          </div>
        </>
      )}
      <form onSubmit={submit} noValidate style={{ marginTop: 18 }}>
        <label className="field">
          <small>Your name</small>
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="given-name"
            enterKeyHint="done"
            aria-invalid={error !== null}
            aria-describedby={error ? "join-error" : undefined}
          />
        </label>
        {error && (
          <p id="join-error" className="field-error" role="alert">
            {error}
          </p>
        )}
        <PhotoField photo={photo} onChange={setPhoto} />
        <PhoneField
          country={country}
          typed={typedPhone}
          onCountry={setCountry}
          onTyped={(value) => {
            setTypedPhone(value);
            setPhoneError(null);
          }}
          error={phoneError}
        />
        <button type="submit" className="btn" style={{ marginTop: 6 }}>
          {label}
        </button>
      </form>
    </Sheet>
  );
}
