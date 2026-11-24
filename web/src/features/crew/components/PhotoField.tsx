import { useId, useState, type ChangeEvent } from "react";
import { makePhoto } from "../api/photo";
import "./PhotoField.css";

interface PhotoFieldProps {
  /** The photo now: a data URL, or null for none. */
  photo: string | null;
  /** Called with the new photo, or null when the friend removes it. */
  onChange: (photo: string | null) => void;
}

/**
 * The photo picker: a button that opens the phone's photo picker, the
 * chosen photo in a circle, and "Remove photo". The picked file becomes a
 * 160 px JPEG on the phone before anything is saved; a file it cannot use
 * is refused under the button, with the reason.
 *
 * Inputs: the photo now, and what a change does.
 * Output: the field. The file input is the real control (keyboard and
 * screen readers reach it); its label is the visible button.
 * Examples (checked in Chrome at 375 px):
 *   no photo                           → one button, "Add a photo (optional)"
 *   a photo                            → the photo, "Change photo" and "Remove photo"
 *   a .txt file                        → "That file is not a photo. Pick another." under the button
 */
export function PhotoField({ photo, onChange }: PhotoFieldProps) {
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const id = useId();

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReading(true);
    const result = await makePhoto(file);
    setReading(false);
    setError(result.ok ? null : result.message);
    if (result.ok) onChange(result.url);
  };

  return (
    <div className="photo-field">
      <div className="photo-row">
        {photo && <img className="photo-preview" src={photo} alt="Your photo" />}
        <label className={`pill photo-pick${reading ? " busy" : ""}`} htmlFor={id}>
          <input
            id={id}
            type="file"
            accept="image/*"
            className="photo-input"
            onChange={pick}
            disabled={reading}
            aria-invalid={error !== null}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {photo ? "Change photo" : "Add a photo (optional)"}
        </label>
        {photo && (
          <button type="button" className="pill" onClick={() => onChange(null)} disabled={reading}>
            Remove photo
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="field-error photo-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
