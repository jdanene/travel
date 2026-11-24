import { useEffect, useState } from "react";
import { DateField } from "../../../components/Calendar";
import { Sheet } from "../../../components/Sheet";
import { idFromName } from "../../../lib/ids";
import { readLink, type ReadLink } from "../../../lib/reader";
import type { Area, StayOption } from "../../../types/trip";
import { listingLink, stayId } from "../lib/stay";
import { scenery } from "./scenery";

interface AddPlaceSheetProps {
  open: boolean;
  destinations: Array<{ id: string; name: string }>;
  /** Every city to offer: the destinations, then the cities friends added. */
  cities: string[];
  /** The city the sheet opens with: the city group the friend tapped Add in, else the only city so far, else the first. */
  city?: string;
  /** The month the calendar opens on: the trip season's first month. */
  startMonth?: string;
  areas: Area[];
  /** The ids already in the list, to catch a duplicate before any call. */
  known: string[];
  memberId: string;
  onClose: () => void;
  /** Saves the option; resolves false when the listing turned out to be there already. */
  onAdd: (id: string, option: StayOption) => Promise<boolean>;
  /** Brings an existing card into view (case 17). */
  onShow: (id: string) => void;
}

type Reading = { state: "idle" } | { state: "reading"; url: string } | { state: "read"; url: string; found: ReadLink | null };

/**
 * Add a place (20/5): paste a link, pick the city or type a new one (it
 * opens on the city the friend added from), give
 * the dates if you have them, check what the
 * reader found, and add it. When the reader finds nothing (Booking.com
 * always), the same positions hold inputs for the name, the area and
 * "sleeps"; that is a normal path, not a failure (exception 4).
 *
 * Inputs: whether it is open, the destinations and their areas, the ids
 * already listed, this member, and what closing, adding and showing do.
 * Output: the sheet. Text that is not an Airbnb or Booking.com link gets
 * "Paste an Airbnb or Booking.com link." and no call (case 15). A listing
 * already in the list closes the sheet and brings its card into view.
 * "Add to Bali" works with a name alone. Any city is allowed (owner, 24
 * Nov 2026); the dates are optional, picked on the shared calendar (any
 * day, opening on the season's first month), and check-out is never before check-in.
 * Examples (checked on the emulator against the deployed reader):
 *   an Airbnb room       → its photo, name, "area · sleeps N · added by you", "Add to Bali"
 *   a Booking.com hotel  → "Add the name and area.", the Name, Area and Sleeps inputs
 *   "Add" in the Koh Phangan group → the sheet opens with Koh Phangan picked
 */
export function AddPlaceSheet({ open, destinations, cities, city: startCity, startMonth, areas, known, memberId, onClose, onAdd, onShow }: AddPlaceSheetProps) {
  const [text, setText] = useState("");
  const [city, setCity] = useState(startCity ?? cities[0] ?? "");
  const [typing, setTyping] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reading, setReading] = useState<Reading>({ state: "idle" });
  const [name, setName] = useState("");
  const [sleeps, setSleeps] = useState("");
  const [saving, setSaving] = useState(false);
  // Each opening starts on the city it was opened from (owner, 24 Nov 2026: "we are at the city.. it should auto show city"); a pill still changes it.
  useEffect(() => {
    if (!open) return;
    setCity(startCity ?? cities[0] ?? "");
    setTyping(false);
    // Only a new opening resets the city; a new list of cities while open does not.
  }, [open, startCity]);

  const url = listingLink(text);
  const place = city.trim().slice(0, 60);
  const destination = destinations.find((candidate) => idFromName(candidate.name) === idFromName(place))?.id;
  const here = areas.filter((candidate) => candidate.destination === destination);
  const datesOk = !to || (from !== "" && from <= to);
  const found = reading.state === "read" ? reading.found : null;
  const readArea = found?.area && here.find((candidate) => idFromName(candidate.name) === idFromName(found.area!))?.name;
  const finalName = (found?.name ?? name).trim().slice(0, 120);
  const finalArea = readArea || place;
  const typedSleeps = Number.parseInt(sleeps, 10);
  const finalSleeps = found?.sleeps ?? (typedSleeps >= 1 && typedSleeps <= 50 ? typedSleeps : undefined);

  const reset = () => {
    setText("");
    setReading({ state: "idle" });
    setName("");
    setTyping(false);
    setFrom("");
    setTo("");
    setSleeps("");
    setSaving(false);
  };
  const close = () => {
    reset();
    onClose();
  };

  const paste = (value: string) => {
    setText(value);
    const link = listingLink(value);
    if (!link) return setReading({ state: "idle" });
    const id = stayId(link.href);
    if (known.includes(id)) {
      close();
      return onShow(id);
    }
    const href = link.href;
    setReading({ state: "reading", url: href });
    void readLink(href).then((result) =>
      setReading((current) => (current.state === "reading" && current.url === href ? { state: "read", url: href, found: result } : current)),
    );
  };

  const add = async () => {
    if (!url || !finalName || !place || !datesOk) return;
    setSaving(true);
    const id = stayId(url.href);
    const option: StayOption = {
      ...(destination ? { destination } : {}),
      city: place,
      url: url.href,
      name: finalName,
      area: finalArea.slice(0, 60),
      addedBy: memberId,
      at: Date.now(),
      ...(from ? { from } : {}),
      ...(from && to ? { to } : {}),
      ...(finalSleeps ? { sleeps: finalSleeps } : {}),
      ...(found?.photoUrl ? { photoUrl: found.photoUrl } : {}),
    };
    const added = await onAdd(id, option);
    close();
    if (!added) onShow(id);
  };

  return (
    <Sheet open={open} title="Add a place" onClose={close}>
      <p className="sub" style={{ margin: "4px 0 12px" }}>
        Paste an Airbnb or Booking.com link.
      </p>
      <label className="field">
        <small>Link</small>
        <input value={text} onChange={(event) => paste(event.target.value)} inputMode="url" placeholder="airbnb.com/rooms/…" autoComplete="off" />
      </label>
      {text.trim() !== "" && !url && (
        <p className="field-error" role="alert">
          Paste an Airbnb or Booking.com link.
        </p>
      )}
      <div className="pills" role="group" aria-label="City" style={{ margin: "4px 0 10px" }}>
        {cities.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className="pill"
            aria-pressed={!typing && idFromName(candidate) === idFromName(place)}
            onClick={() => {
              setTyping(false);
              setCity(candidate);
            }}
          >
            {candidate}
          </button>
        ))}
        <button
          type="button"
          className="pill"
          aria-pressed={typing}
          onClick={() => {
            setTyping(true);
            setCity("");
          }}
        >
          + City
        </button>
      </div>
      {typing && (
        <label className="field">
          <small>City</small>
          <input value={city} onChange={(event) => setCity(event.target.value)} maxLength={60} autoFocus autoComplete="off" />
        </label>
      )}
      <DateField
        label="Check-in and check-out (optional)"
        placeholder="Pick the nights"
        from={from}
        to={to}
        startMonth={startMonth}
        onPick={(start, end) => {
          setFrom(start);
          setTo(end);
        }}
      />
      {!datesOk && (
        <p className="field-error" role="alert">
          Check-out is after check-in.
        </p>
      )}
      {reading.state === "reading" && <div className="place-preview" aria-busy="true" aria-label="Reading the link" />}
      {reading.state === "read" && (
        <>
          <img className="place-preview" src={found?.photoUrl ?? scenery(idFromName(finalArea), destination ?? "")} alt="" />
          {found?.name ? (
            <p className="h3" style={{ marginTop: 10 }}>
              {found.name}
            </p>
          ) : (
            <>
              <p className="sub" style={{ margin: "10px 0 8px" }}>
                Add the name.
              </p>
              <label className="field">
                <small>Name</small>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
              </label>
            </>
          )}
          {found?.sleeps ? null : (
            <label className="field">
              <small>Sleeps</small>
              <input value={sleeps} onChange={(event) => setSleeps(event.target.value)} inputMode="numeric" />
            </label>
          )}
          <p className="sub" style={{ fontSize: 14 }}>
            {[finalArea, finalSleeps ? `sleeps ${finalSleeps}` : null, "added by you"].filter(Boolean).join(" · ")}
          </p>
        </>
      )}
      <button type="button" className="btn" style={{ marginTop: 14 }} disabled={!url || !finalName || !place || !datesOk || saving || reading.state === "reading"} onClick={() => void add()}>
        {place ? `Add to ${place}` : "Add"}
      </button>
    </Sheet>
  );
}
