import { useState } from "react";
import type { PlaceKind } from "../../../types/trip";
import { PLACE_KINDS, PLACE_NAME_MAX } from "../lib/places";

interface AddPlaceFormProps {
  /** The name of the place picked in the search; empty after a tap on the map. */
  initialName: string;
  /** Saves the place; the map shows the pin at once. */
  onAdd: (place: { name: string; kind: PlaceKind; link?: string }) => void;
}

/**
 * Add to map, once the pin is down: the name, what it is as chips, and an
 * optional link, under the map so the friend can still drag the pin. In
 * the pattern of the Add a link sheet's fields.
 *
 * Inputs: the name the search filled in, and what adding does.
 * Output: the fields and "Add". "Add" waits for a name and a kind. Text in
 * the link field that is not an https link gets "Paste a link that starts
 * with https://" and no save.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   picked "Single Fin", Food, no link → "Add" saves it
 *   link "tiktok.com/@x"               → "Paste a link that starts with https://"
 */
export function AddPlaceForm({ initialName, onAdd }: AddPlaceFormProps) {
  const [name, setName] = useState(initialName);
  const [kind, setKind] = useState<PlaceKind | null>(null);
  const [link, setLink] = useState("");

  const cleanLink = link.trim();
  const badLink = cleanLink !== "" && !/^https:\/\/\S+$/.test(cleanLink);
  const ready = name.trim() !== "" && kind !== null && !badLink;

  const add = () => {
    if (!ready || !kind) return;
    onAdd({ name: name.trim().slice(0, PLACE_NAME_MAX), kind, ...(cleanLink ? { link: cleanLink.slice(0, 500) } : {}) });
  };

  return (
    <div className="place-form">
      <label className="field">
        <small>Name</small>
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={PLACE_NAME_MAX} autoComplete="off" required />
      </label>
      <p className="map-field-label" id="place-kind">
        What is it?
      </p>
      <div className="pills" role="group" aria-labelledby="place-kind" style={{ margin: "0 0 14px" }}>
        {PLACE_KINDS.map((entry) => (
          <button key={entry.kind} type="button" className="pill" aria-pressed={entry.kind === kind} onClick={() => setKind(entry.kind)}>
            {entry.word}
          </button>
        ))}
      </div>
      <label className="field">
        <small>Link (optional)</small>
        <input value={link} onChange={(event) => setLink(event.target.value)} inputMode="url" autoComplete="off" />
      </label>
      {badLink && (
        <p className="field-error" role="alert">
          Paste a link that starts with https://
        </p>
      )}
      <button type="button" className="btn" style={{ marginTop: 14 }} disabled={!ready} onClick={add}>
        Add
      </button>
    </div>
  );
}
