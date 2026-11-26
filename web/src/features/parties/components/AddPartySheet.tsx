import { useState, type FormEvent } from "react";
import { DateField } from "../../../components/Calendar";
import { Sheet } from "../../../components/Sheet";
import { isDay } from "../../../lib/calendar";
import { initials } from "../../../lib/initials";
import { nearestDestination, type Spot } from "../../../lib/placeSearch";
import type { Show } from "../../../types/trip";
import type { PartyDraft } from "../api/parties";
import { showTimes } from "../lib/detail";
import type { VenueSpot, VenueSuggestion } from "../lib/venues";
import { VenueField } from "./VenueField";

type Field = "venue" | "destination" | "date" | "startTime" | "endTime" | "artist" | "about" | "link";

/** The longest area the rules take on a show. */
const AREA_MAX = 60;

interface AddPartySheetProps {
  open: boolean;
  /** The show being edited; absent when adding. */
  editing?: Show;
  /** Each destination's id, its name with its country ("Bali, Indonesia") and its centre. */
  destinations: Array<{ id: string; name: string; lat?: number; lng?: number }>;
  /** Every venue the trip knows, in every destination: the trip's clubs, friends' venues and friends' places on the map. */
  venues: VenueSpot[];
  /** The month the calendar opens on: the trip season's first month. */
  startMonth?: string;
  /** This device's member name, for "added by KA". */
  yourName: string;
  onClose: () => void;
  onSave: (draft: PartyDraft) => void;
  onRemove: () => void;
}

/**
 * Screen 20/8, "Add an event", search first (owner, 24 Nov 2026: "like
 * google not have preselected"; "how do users add a venue???"). The sheet
 * opens on one search field with the caret in it and no place preselected;
 * it lists the trip's clubs in every destination, each with its place
 * (VenueField). The pick says where the event lists: a known venue keeps
 * its destination; a place from the search goes to the trip's nearest
 * destination and gets a pin on the map when the event is saved, with its
 * area and country kept on the event; 'Add "…" as a new venue' asks
 * "Where is it?" with the destinations as pills, none picked. Then the
 * date on the shared calendar, any day of any year, opening on the season's
 * first month; then when it starts and ends, both optional, side by side,
 * as the phone's own time pickers ("HH:MM" at the venue, no time zone;
 * owner, 25 Nov 2026: "start and end time when applicble"); who is
 * playing; an optional "What is it?" line and link.
 * The same sheet edits an event, with "Remove" at its foot.
 *
 * Inputs: whether it is open, the show being edited (if any), the
 * destinations and known venues, the calendar's first month, this
 * member's name, and what saving, removing and closing do.
 * Output: the sheet. Save checks every field first and puts the reason
 * under the field (case 27); the typed values stay.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   open → caret in "Search for a venue or place"; Savaya · Bali, Indonesia first
 *   pick "Single Fin" → "Lists under Bali, Indonesia"; the event lists under Single Fin
 *   "bottle beach", pick "Bottle Beach 1 · Haad Khuat, Thailand" → "Lists under Koh Phangan, Thailand"; Save adds the event and its pin
 *   'Add "Haad Rin pier" as a new venue', Save → "Pick where it is." under the pills
 *   Date, tap "Previous month" → January 2027; 24 Jan saves
 *   Starts 22:00, Ends 04:00, Save → the sheet and the event page read "10 pm – 4 am"
 *   Ends 04:00 with Starts empty, Save → "Add when it starts." under Ends
 *   Edit, clear both times, Save → the time line goes
 */
export function AddPartySheet(props: AddPartySheetProps) {
  return (
    <Sheet open={props.open} title={props.editing ? "Edit" : "Add an event"} onClose={props.onClose}>
      {props.open && <PartyForm key={props.editing ? `${props.editing.date}${props.editing.artist}` : "new"} {...props} />}
    </Sheet>
  );
}

function PartyForm({ editing, destinations, venues, startMonth, yourName, onSave, onRemove }: AddPartySheetProps) {
  // An old show has no times, and one written in another shape opens empty.
  const times = showTimes(editing?.startTime, editing?.endTime);
  const [draft, setDraft] = useState<PartyDraft>({
    destination: editing?.destination ?? "",
    venue: editing?.venue ?? "",
    date: editing?.date ?? "",
    artist: editing?.artist ?? "",
    about: editing?.about ?? "",
    link: editing?.link ?? "",
    startTime: times.startTime ?? "",
    endTime: times.endTime ?? "",
  });
  /** true after 'Add "…" as a new venue': the friend says where it is. */
  const [asking, setAsking] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const set = (field: "date" | "startTime" | "endTime" | "artist" | "about" | "link", value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const placeOf = (id: string) => destinations.find((destination) => destination.id === id)?.name ?? id;
  // New words are a new search: the pick, its place, pin and area go, and the words stay.
  const type = (words: string) => {
    setDraft((current) => ({ ...current, venue: words, destination: "", spot: undefined, area: "" }));
    setAsking(false);
    setErrors((current) => ({ ...current, venue: undefined, destination: undefined }));
  };
  const pickVenue = (line: VenueSuggestion) => {
    const next: Pick<PartyDraft, "venue" | "destination" | "spot" | "area"> =
      line.kind === "known"
        ? { venue: line.venue.name, destination: line.venue.destination, spot: undefined, area: "" }
        : line.kind === "place"
          ? { venue: line.hit.name, destination: nearestDestination(destinations, line.hit) ?? "", spot: { lat: line.hit.lat, lng: line.hit.lng }, area: (line.hit.area ?? "").slice(0, AREA_MAX) }
          : { venue: line.name, destination: "", spot: undefined, area: "" };
    setDraft((current) => ({ ...current, ...next }));
    setAsking(next.destination === "");
    setErrors((current) => ({ ...current, venue: undefined, destination: undefined }));
  };
  const chooseDestination = (id: string) => {
    setDraft((current) => ({ ...current, destination: id }));
    setErrors((current) => ({ ...current, destination: undefined }));
  };
  const region: Spot[] = destinations.flatMap(({ lat, lng }) => (typeof lat === "number" && typeof lng === "number" ? [{ lat, lng }] : []));
  const near = (): Spot => region[0] ?? { lat: 0, lng: 0 };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    // A time half typed (hours, no minutes) reads as "" but is not empty.
    const half = (name: "startTime" | "endTime") => (form.elements.namedItem(name) as HTMLInputElement | null)?.validity.badInput === true;
    const found = problems(draft, asking, { startTime: half("startTime"), endTime: half("endTime") });
    setErrors(found);
    const first = (["venue", "destination", "date", "startTime", "endTime", "artist", "about", "link"] as Field[]).find((field) => found[field]);
    if (first) return form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    onSave(draft);
  };

  const errorLine = (name: Field) =>
    errors[name] && (
      <p id={`party-${name}-error`} className="field-error" role="alert">
        {errors[name]}
      </p>
    );
  const field = (name: Field, label: string, input: JSX.Element) => (
    <>
      <label className="field">
        <small>{label}</small>
        {input}
      </label>
      {errorLine(name)}
    </>
  );
  const described = (name: Field) => ({ name, "aria-invalid": errors[name] !== undefined, "aria-describedby": errors[name] ? `party-${name}-error` : undefined });

  return (
    <form className="party-sheet" onSubmit={submit} noValidate>
      {!editing && <p className="sub party-sheet-lead">It joins the list for everyone, with your initials.</p>}
      <VenueField {...described("venue")} value={draft.venue} known={venues} placeOf={placeOf} near={near} region={region} onType={type} onPick={pickVenue} autoFocus={!editing} error={errorLine("venue")} />
      {draft.destination && !asking && <p className="cap venue-where">Lists under {placeOf(draft.destination)}</p>}
      {asking && (
        <div className="venue-ask">
          <p id="party-where" className="cap">
            Where is it?
          </p>
          <div className="pills" role="group" aria-labelledby="party-where">
            {destinations.map((destination, at) => (
              <button
                key={destination.id}
                type="button"
                className="pill"
                aria-pressed={draft.destination === destination.id}
                {...(at === 0 ? described("destination") : {})}
                onClick={() => chooseDestination(destination.id)}
              >
                {destination.name}
              </button>
            ))}
          </div>
          {errorLine("destination")}
        </div>
      )}
      <DateField {...described("date")} label="Date" placeholder="Pick a day" from={draft.date} startMonth={startMonth} onPick={(day) => set("date", day)} error={errorLine("date")} />
      <div className="party-times">
        <div>{field("startTime", "Starts (optional)", <input {...described("startTime")} type="time" value={draft.startTime} onChange={(e) => set("startTime", e.target.value)} />)}</div>
        <div>{field("endTime", "Ends (optional)", <input {...described("endTime")} type="time" value={draft.endTime} onChange={(e) => set("endTime", e.target.value)} />)}</div>
      </div>
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
 * Inputs: the draft; asking — whether the sheet asks "Where is it?"; half —
 * which time field holds a time half typed. Any
 * real day is a date (owner, 24 Nov 2026: "don't restrict the calendar").
 * Output: a reason per wrong field; none when the draft can be saved.
 * Examples (checked on screen):
 *   empty venue                          → { venue: "Add the venue." }
 *   typed words, nothing picked          → { venue: "Pick a line from the list." }
 *   a new venue, no place picked         → { destination: "Pick where it is." }
 *   Ends 04:00, Starts empty             → { endTime: "Add when it starts." }
 */
function problems(draft: PartyDraft, asking: boolean, half: { startTime: boolean; endTime: boolean }): Partial<Record<Field, string>> {
  const found: Partial<Record<Field, string>> = {};
  if (!draft.venue.trim()) found.venue = "Add the venue.";
  else if (!draft.destination) {
    if (asking) found.destination = "Pick where it is.";
    else found.venue = "Pick a line from the list.";
  }
  if (!isDay(draft.date)) found.date = "Pick a day.";
  if (half.startTime) found.startTime = "Finish the time, or clear it.";
  if (half.endTime) found.endTime = "Finish the time, or clear it.";
  else if (draft.endTime && !draft.startTime && !half.startTime) found.endTime = "Add when it starts.";
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
