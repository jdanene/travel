import { useState, type FormEvent } from "react";
import { Sheet } from "../../../components/Sheet";
import { dayMonth } from "../../../lib/format";
import { initials } from "../../../lib/initials";
import type { Show } from "../../../types/trip";
import type { PartyDraft } from "../api/parties";

type Field = "venue" | "date" | "artist" | "link";

interface AddPartySheetProps {
  open: boolean;
  /** The show being edited; absent when adding. */
  editing?: Show;
  /** Each destination's id and name, in the order of the pills. */
  destinations: Array<{ id: string; name: string }>;
  /** The venues already listed per destination, offered as the venue is typed. */
  venues: Record<string, string[]>;
  season: { from: string; to: string };
  /** This device's member name, for "added by KA". */
  yourName: string;
  onClose: () => void;
  onSave: (draft: PartyDraft) => void;
  onRemove: () => void;
}

/**
 * Screen 20/8, "Add a party": the destination, the venue, the date, who is
 * playing and an optional link. The same sheet edits a party, with
 * "Remove" at its foot.
 *
 * Inputs: whether it is open, the show being edited (if any), the
 * destinations and known venues, the season, this member's name, and what
 * saving, removing and closing do.
 * Output: the sheet. Save checks every field first and puts the reason
 * under the field (case 27); the typed values stay.
 * Examples (checked at 390 px against screen 8):
 *   add, Koh Phangan, "Haad Rin pier", Sat 20 Feb, "Boat party" → Save; the row reads "added by KA"
 *   date 2027-04-02 → "Pick a day from 1 Feb to 31 Mar." under Date
 */
export function AddPartySheet(props: AddPartySheetProps) {
  return (
    <Sheet open={props.open} title={props.editing ? "Edit" : "Add a party"} onClose={props.onClose}>
      {props.open && <PartyForm key={props.editing ? `${props.editing.date}${props.editing.artist}` : "new"} {...props} />}
    </Sheet>
  );
}

function PartyForm({ editing, destinations, venues, season, yourName, onSave, onRemove }: AddPartySheetProps) {
  const [draft, setDraft] = useState<PartyDraft>({
    destination: editing?.destination ?? destinations[0]?.id ?? "",
    venue: editing?.venue ?? "",
    date: editing?.date ?? "",
    artist: editing?.artist ?? "",
    link: editing?.link ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const set = (field: keyof PartyDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = problems(draft, season);
    setErrors(found);
    const first = (["venue", "date", "artist", "link"] as Field[]).find((field) => found[field]);
    if (first) return event.currentTarget.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
    onSave(draft);
  };

  const field = (name: Field, label: string, input: JSX.Element) => (
    <>
      <label className="field">
        <small>{label}</small>
        {input}
      </label>
      {errors[name] && (
        <p id={`party-${name}-error`} className="field-error" role="alert">
          {errors[name]}
        </p>
      )}
    </>
  );
  const described = (name: Field) => ({ name, "aria-invalid": errors[name] !== undefined, "aria-describedby": errors[name] ? `party-${name}-error` : undefined });

  return (
    <form className="party-sheet" onSubmit={submit} noValidate>
      {!editing && <p className="sub party-sheet-lead">It joins the list for everyone, with your initials.</p>}
      <div className="pills" role="group" aria-label="Destination">
        {destinations.map((destination) => (
          <button key={destination.id} type="button" className="pill" aria-pressed={draft.destination === destination.id} onClick={() => set("destination", destination.id)}>
            {destination.name}
          </button>
        ))}
      </div>
      {field("venue", "Venue", <input {...described("venue")} value={draft.venue} maxLength={60} list="party-venues" autoComplete="off" onChange={(e) => set("venue", e.target.value)} />)}
      <datalist id="party-venues">
        {(venues[draft.destination] ?? []).map((venue) => (
          <option key={venue} value={venue} />
        ))}
      </datalist>
      {field("date", "Date", <input {...described("date")} type="date" value={draft.date} min={season.from} max={season.to} onChange={(e) => set("date", e.target.value)} />)}
      {field("artist", "Who is playing", <input {...described("artist")} value={draft.artist} maxLength={200} autoComplete="off" onChange={(e) => set("artist", e.target.value)} />)}
      {field(
        "link",
        "Link (optional)",
        <input {...described("link")} type="url" inputMode="url" value={draft.link} maxLength={500} placeholder="Event or Instagram link" autoComplete="off" onChange={(e) => set("link", e.target.value)} />,
      )}
      <button type="submit" className="btn" style={{ marginTop: 10 }}>
        Save
      </button>
      {editing ? (
        <button type="button" className="btn sec remove" onClick={onRemove}>
          Remove
        </button>
      ) : (
        <p className="cap">Shows in the list as "added by {initials(yourName)}"</p>
      )}
    </form>
  );
}

/**
 * Checks a draft before it is saved, so a refusal never reaches the rules.
 * Inputs: the draft and the trip's season. Output: a reason per wrong field;
 * none when the draft can be saved.
 * Examples (checked on screen): empty venue → { venue: "Add the venue." }
 */
function problems(draft: PartyDraft, season: { from: string; to: string }): Partial<Record<Field, string>> {
  const found: Partial<Record<Field, string>> = {};
  if (!draft.venue.trim()) found.venue = "Add the venue.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || draft.date < season.from || draft.date > season.to) {
    found.date = `Pick a day from ${dayMonth(season.from)} to ${dayMonth(season.to)}.`;
  }
  if (!draft.artist.trim()) found.artist = "Add who is playing.";
  const link = draft.link.trim();
  if (link && !isAddress(link)) found.link = "Paste a link that starts with https://";
  return found;
}

function isAddress(text: string): boolean {
  try {
    return /^https?:$/.test(new URL(text).protocol);
  } catch {
    return false;
  }
}
