import { useId, type Ref } from "react";
import { Icon } from "../../../components/Icon";
import { COUNTRIES } from "../lib/phone";
import "./PhoneField.css";

/** The format a +1 number is typed in; other countries' formats differ too much for one hint. */
const US_HINT = "(415) 555-0123";

interface PhoneFieldProps {
  /** The picker's country code, without "+". */
  country: string;
  /** The number as typed. */
  typed: string;
  onCountry: (code: string) => void;
  onTyped: (typed: string) => void;
  /** Why the number cannot be used, shown under the field. */
  error: string | null;
  /**
   * The ids of a heading and a note drawn outside the field, as "You" draws them.
   * When given, the field draws neither its own label nor the STOP line, and names its input by them.
   */
  outside?: { label: string; note: string };
  /** The phone input, for a sheet that moves focus to it. */
  inputRef?: Ref<HTMLInputElement>;
}

/**
 * "Phone for trip texts (optional)": the sheet's field look, with a
 * country picker (+1 first) in front of a phone input, and the promise
 * under it: "Only trip updates from the organizer. Reply STOP to stop."
 * It only holds what is typed; the sheet turns it into E.164 with
 * toE164() and saves it. The join sheet and the "You" sheet use it; "You"
 * draws the label and the promise itself, above the field.
 *
 * Inputs: the country, the typed number, what a change of either does, the
 * error, the outside label and note when the sheet draws them, and a ref to the input.
 * Output: the field. The picker and the input are real form controls with
 * their own names for screen readers; the phone's number pad opens. For +1
 * an empty field shows the format, "(415) 555-0123".
 * Examples (checked on the emulator at 390 px and 1650 px):
 *   empty            → "+1" and "(415) 555-0123" in grey; the STOP line under it
 *   "555-0123", Save → "Check the number." under the field
 *   "+44" picked     → no format hint; the field is empty
 */
export function PhoneField({ country, typed, onCountry, onTyped, error, outside, inputRef }: PhoneFieldProps) {
  const id = useId();
  const label = outside?.label ?? `${id}-label`;
  const note = outside?.note ?? `${id}-note`;
  return (
    <div className="phone-field">
      <div className="field phone-box">
        {!outside && <small id={label}>Phone for trip texts (optional)</small>}
        <div className="phone-row">
          {/* The closed picker shows only "+1"; the real select lies over it, so it opens the phone's own list. */}
          <span className="phone-country">
            <span aria-hidden="true">+{country}</span>
            <Icon name="chev" size={14} />
            <select value={country} onChange={(event) => onCountry(event.target.value)} aria-label="Country code">
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  +{c.code} {c.name}
                </option>
              ))}
            </select>
          </span>
          <input
            ref={inputRef}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={country === "1" ? US_HINT : undefined}
            value={typed}
            onChange={(event) => onTyped(event.target.value)}
            aria-labelledby={label}
            aria-invalid={error !== null}
            aria-describedby={`${note}${error ? ` ${id}-error` : ""}`}
            enterKeyHint="done"
          />
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
      {!outside && (
        <p id={note} className="cap phone-note">
          Only trip updates from the organizer. Reply STOP to stop.
        </p>
      )}
    </div>
  );
}
