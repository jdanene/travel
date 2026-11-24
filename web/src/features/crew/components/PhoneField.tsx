import { useId } from "react";
import { Icon } from "../../../components/Icon";
import { COUNTRIES } from "../lib/phone";
import "./PhoneField.css";

interface PhoneFieldProps {
  /** The picker's country code, without "+". */
  country: string;
  /** The number as typed. */
  typed: string;
  onCountry: (code: string) => void;
  onTyped: (typed: string) => void;
  /** Why the number cannot be used, shown under the field. */
  error: string | null;
}

/**
 * "Phone for trip texts (optional)": the sheet's field look, with a
 * country picker (+1 first) in front of a phone input, and the promise
 * under it: "Only trip updates from the organizer. Reply STOP to stop."
 * It only holds what is typed; the sheet turns it into E.164 with
 * toE164() and saves it. The join sheet and the "You" sheet use it.
 *
 * Inputs: the country, the typed number, what a change of either does, and the error.
 * Output: the field. The picker and the input are real form controls with
 * their own names for screen readers; the phone's number pad opens.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   empty            → "+1" and an empty field; the STOP line under it
 *   "555-0123", Save → "Check the number." under the field
 */
export function PhoneField({ country, typed, onCountry, onTyped, error }: PhoneFieldProps) {
  const id = useId();
  return (
    <div className="phone-field">
      <div className="field phone-box">
        <small id={`${id}-label`}>Phone for trip texts (optional)</small>
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
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={typed}
            onChange={(event) => onTyped(event.target.value)}
            aria-labelledby={`${id}-label`}
            aria-invalid={error !== null}
            aria-describedby={`${id}-note${error ? ` ${id}-error` : ""}`}
            enterKeyHint="done"
          />
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
      <p id={`${id}-note`} className="cap phone-note">
        Only trip updates from the organizer. Reply STOP to stop.
      </p>
    </div>
  );
}
