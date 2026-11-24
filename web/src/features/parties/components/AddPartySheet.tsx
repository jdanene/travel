import { useState, type FormEvent } from "react";
import { Sheet } from "../../../components/Sheet";
import { initials } from "../../../lib/initials";
import { nearestDestination, type PlaceHit, type Spot } from "../../../lib/placeSearch";
import type { Show } from "../../../types/trip";
import type { PartyDraft } from "../api/parties";
import { VenueField } from "./VenueField";

type Field = "venue" | "date" | "artist" | "about" | "link";

interface AddPartySheetProps {
  open: boolean;
  /** The show being edited; absent when adding. */
  editing?: Show;
  /** Each destination's id, name and centre, in the order of the pills. */
  destinations: Array<{ id: string; name: string; lat?: number; lng?: number }>;
  /** The venues the Venue field suggests first, per destination: the trip's venues, friends' venues and friends' places on the map. */
  venues: Record<string, string[]>;
  /** This device's member name, for "added by KA". */
  yourName: string;
  onClose: () => void;
  onSave: (draft: PartyDraft) => void;
  onRemove: () => void;
}

/**
 * Screen 20/8, "Add an event": the destination, the venue, the date, who is
 * playing, an optional "What is it?" line and an optional link. The Venue
 * field suggests the destination's known places first, then any place in
 * the world from the place search (VenueField). A known pick is that
 * place; a search pick also puts a pin on the map when the event is saved,
 * and moves the destination to the trip's nearest one, so the event and its
 * pin group together. Typed words with no pick are the venue, with no pin.
 * The same sheet edits an event, with "Remove" at its foot.
 *
 * Inputs: whether it is open, the show being edited (if any), the
 * destinations and known venues, this member's name, and what
 * saving, removing and closing do.
 * Output: the sheet. Save checks every field first and puts the reason
 * under the field (case 27); the typed values stay.
 * Examples (checked at 390 px against screen 8):
 *   add, Koh Phangan, type "Haad Rin pier", Sat 20 Feb, "Boat party" → Save; the row reads "added by KA", no pin
 *   add, Bali, pick "Single Fin" → the event lists under Single Fin and opens the Map on its pin
 *   add, Bali, "bottle beach", pick "Bottle Beach 1 · Haad Khuat, Thailand" → Koh Phangan; Save adds the event and its pin
 *   date 2027-01-24 → "Pick a day from 25 Jan to 31 Mar." under Date (lib/window.ts)
 */
export function AddPartySheet(props: AddPartySheetProps) {
  return (
    <Sheet open={props.open} title={props.editing ? "Edit" : "Add an event"} onClose={props.onClose}>
      {props.open && <PartyForm key={props.editing ? `${props.editing.date}${props.editing.artist}` : "new"} {...props} />}
    </Sheet>
  );
}

function PartyForm({ editing, destinations, venues, yourName, onSave, onRemove }: AddPartySheetProps) {
  const [draft, setDraft] = useState<PartyDraft>({
    destination: editing?.destination ?? destinations[0]?.id ?? "",
    venue: editing?.venue ?? "",
    date: editing?.date ?? "",
    artist: editing?.artist ?? "",
    about: editing?.about ?? "",
    link: editing?.link ?? "",
  });
  const offered = venues[draft.destination] ?? [];
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const set = (field: Exclude<keyof PartyDraft, "spot">, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field === "destination" ? "venue" : field]: undefined }));
  };
  // A pin belongs to the place picked: new words or another destination drop it, and the words stay.
  const chooseDestination = (id: string) => setDraft((current) => ({ ...current, destination: id, spot: undefined }));
  const type = (words: string) => {
    setDraft((current) => ({ ...current, venue: words, spot: undefined }));
    setErrors((current) => ({ ...current, venue: undefined }));
  };
  const pickVenue = (venue: string, hit?: PlaceHit) => {
    setDraft((current) => ({
      ...current,
      venue,
      ...(hit ? { destination: nearestDestination(destinations, hit) ?? current.destination, spot: { lat: hit.lat, lng: hit.lng } } : { spot: undefined }),
    }));
    setErrors((current) => ({ ...current, venue: undefined }));
  };
  const region: Spot[] = destinations.flatMap(({ lat, lng }) => (typeof lat === "number" && typeof lng === "number" ? [{ lat, lng }] : []));
  const near = (): Spot => {
    const centre = destinations.find((destination) => destination.id === draft.destination);
    return typeof centre?.lat === "number" && typeof centre.lng === "number" ? { lat: centre.lat, lng: centre.lng } : (region[0] ?? { lat: 0, lng: 0 });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = problems(draft);
    setErrors(found);
    const first = (["venue", "date", "artist", "about", "link"] as Field[]).find((field) => found[field]);
    if (first) return event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
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
          <button key={destination.id} type="button" className="pill" aria-pressed={draft.destination === destination.id} onClick={() => chooseDestination(destination.id)}>
            {destination.name}
          </button>
        ))}
      </div>
      <VenueField
        {...described("venue")}
        value={draft.venue}
        known={offered}
        near={near}
        region={region}
        onType={type}
        onPick={pickVenue}
        error={
          errors.venue && (
            <p id="party-venue-error" className="field-error" role="alert">
              {errors.venue}
            </p>
          )
        }
      />
      {field("date", "Date", <input {...described("date")} type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} />)}
      {field("artist", "Who is playing", <input {...described("artist")} value={draft.artist} maxLength={200} autoComplete="off" onChange={(e) => set("artist", e.target.value)} />)}
      {field("about", "What is it? (optional)", <input {...described("about")} value={draft.about} maxLength={120} autoComplete="off" onChange={(e) => set("about", e.target.value)} />)}
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
 * Inputs: the draft; its date may be any day. Output: a reason per wrong field;
 * none when the draft can be saved.
 * Examples (checked on screen): empty venue → { venue: "Add the venue." }
 */
function problems(draft: PartyDraft): Partial<Record<Field, string>> {
  const found: Partial<Record<Field, string>> = {};
  if (!draft.venue.trim()) found.venue = "Add the venue.";
  // Any day (owner, 24 Nov 2026: "no restrictions"); only an empty date is refused.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) found.date = "Pick a day.";
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
