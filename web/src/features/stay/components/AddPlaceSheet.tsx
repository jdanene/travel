import { useState } from "react";
import { Sheet } from "../../../components/Sheet";
import { idFromName } from "../../../lib/ids";
import { readLink, type ReadLink } from "../../../lib/reader";
import type { Area, StayOption } from "../../../types/trip";
import { listingLink, stayId } from "../lib/stay";
import { scenery } from "./scenery";

interface AddPlaceSheetProps {
  open: boolean;
  destinations: Array<{ id: string; name: string }>;
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
 * Add a place (20/5): paste a link, pick the destination, check what the
 * reader found, and add it. When the reader finds nothing (Booking.com
 * always), the same positions hold inputs for the name, the area and
 * "sleeps"; that is a normal path, not a failure (exception 4).
 *
 * Inputs: whether it is open, the destinations and their areas, the ids
 * already listed, this member, and what closing, adding and showing do.
 * Output: the sheet. Text that is not an Airbnb or Booking.com link gets
 * "Paste an Airbnb or Booking.com link." and no call (case 15). A listing
 * already in the list closes the sheet and brings its card into view.
 * "Add to Bali" works with a name alone; the area then defaults to the
 * destination, and the pin sits at its centre.
 * Examples (checked on the emulator against the deployed reader):
 *   an Airbnb room       → its photo, name, "area · sleeps N · added by you", "Add to Bali"
 *   a Booking.com hotel  → "Add the name and area.", the Name, Area and Sleeps inputs
 */
export function AddPlaceSheet({ open, destinations, areas, known, memberId, onClose, onAdd, onShow }: AddPlaceSheetProps) {
  const [text, setText] = useState("");
  const [destination, setDestination] = useState(destinations[0]?.id ?? "");
  const [reading, setReading] = useState<Reading>({ state: "idle" });
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [sleeps, setSleeps] = useState("");
  const [saving, setSaving] = useState(false);

  const url = listingLink(text);
  const here = areas.filter((candidate) => candidate.destination === destination);
  const found = reading.state === "read" ? reading.found : null;
  const readArea = found?.area && here.find((candidate) => idFromName(candidate.name) === idFromName(found.area!))?.name;
  const place = destinations.find((candidate) => candidate.id === destination)?.name ?? "";
  const finalName = (found?.name ?? name).trim().slice(0, 120);
  const finalArea = (readArea ?? area) || place;
  const typedSleeps = Number.parseInt(sleeps, 10);
  const finalSleeps = found?.sleeps ?? (typedSleeps >= 1 && typedSleeps <= 50 ? typedSleeps : undefined);

  const reset = () => {
    setText("");
    setReading({ state: "idle" });
    setName("");
    setArea("");
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
    if (!url || !finalName) return;
    setSaving(true);
    const id = stayId(url.href);
    const option: StayOption = {
      destination,
      url: url.href,
      name: finalName,
      area: finalArea.slice(0, 60),
      addedBy: memberId,
      at: Date.now(),
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
      <div className="pills" role="group" aria-label="Destination" style={{ margin: "4px 0 14px" }}>
        {destinations.map((candidate) => (
          <button key={candidate.id} type="button" className="pill" aria-pressed={candidate.id === destination} onClick={() => setDestination(candidate.id)}>
            {candidate.name}
          </button>
        ))}
      </div>
      {reading.state === "reading" && <div className="place-preview" aria-busy="true" aria-label="Reading the link" />}
      {reading.state === "read" && (
        <>
          <img className="place-preview" src={found?.photoUrl ?? scenery(idFromName(finalArea), destination)} alt="" />
          {found?.name ? (
            <p className="h3" style={{ marginTop: 10 }}>
              {found.name}
            </p>
          ) : (
            <>
              <p className="sub" style={{ margin: "10px 0 8px" }}>
                Add the name and area.
              </p>
              <label className="field">
                <small>Name</small>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
              </label>
            </>
          )}
          <div className={readArea && found?.sleeps ? "" : "add-facts"}>
            {readArea ? null : (
              <label className="field">
                <small>Area</small>
                <select value={area} onChange={(event) => setArea(event.target.value)}>
                  <option value="">{place}</option>
                  {here.map((candidate) => (
                    <option key={candidate.name} value={candidate.name}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {found?.sleeps ? null : (
              <label className="field">
                <small>Sleeps</small>
                <input value={sleeps} onChange={(event) => setSleeps(event.target.value)} inputMode="numeric" />
              </label>
            )}
          </div>
          <p className="sub" style={{ fontSize: 14 }}>
            {[finalArea, finalSleeps ? `sleeps ${finalSleeps}` : null, "added by you"].filter(Boolean).join(" · ")}
          </p>
        </>
      )}
      <button type="button" className="btn" style={{ marginTop: 14 }} disabled={!url || !finalName || saving || reading.state === "reading"} onClick={() => void add()}>
        Add to {place}
      </button>
    </Sheet>
  );
}
