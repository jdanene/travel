import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import "../../../components/PlaceSearch.css";
import type { PlaceHit, Spot } from "../../../lib/placeSearch";
import { usePlaceHits } from "../../../lib/usePlaceHits";
import { venueSuggestions, type VenueSuggestion } from "../lib/venues";

/** The longest venue the rules take, for a show and for a place on the map. */
const VENUE_MAX = 60;

interface VenueFieldProps {
  /** The venue's words, as the draft holds them. */
  value: string;
  /** The places the trip knows in the destination, by name. */
  known: string[];
  /** Gives the point the search leans toward: the destination's centre. */
  near: () => Spot;
  /** The trip's destination centres; matches near them come first. */
  region: Spot[];
  /** The friend typed; the venue has no pin until a pick. */
  onType: (words: string) => void;
  /** The friend picked a known place, or a new place from the search. */
  onPick: (venue: string, hit?: PlaceHit) => void;
  /** The refusal under the field, if any. */
  error?: ReactNode;
  name?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * Add an event's Venue: one field that suggests as the friend types. The
 * trip's known places come first, then any place in the world from the
 * shared place search (lib/usePlaceHits), "Bottle Beach 1 · Haad Khuat,
 * Thailand". Focus with nothing typed lists the known places. Arrow keys
 * move through the list, Enter picks, Escape closes it. Typing without a
 * pick keeps the words as the venue, with no pin. When the search fails,
 * the known places still show; nothing else is said.
 *
 * Inputs: the venue, the known names, the search's point and region,
 * what typing and picking do, and the field's error wiring.
 * Output: the field and its suggestions.
 * Examples (checked at 375 px and 1650 px):
 *   focus in Bali              → Atlas Beach Club … Ulu Cliffhouse
 *   "bottle" in Koh Phangan    → "Bottle Beach 1 · Haad Khuat, Thailand" and more; a tap picks it
 *   "Haad Rin pier", no pick   → Save keeps "Haad Rin pier" with no pin
 */
export function VenueField({ value, known, near, region, onType, onPick, error, ...field }: VenueFieldProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  /** The words a pick wrote into the field; they are not a new search. */
  const [picked, setPicked] = useState<string | null>(null);
  const live = open && value.trim() !== picked;
  const { hits } = usePlaceHits(live ? value : "", near, region);
  const shown = live ? venueSuggestions(value, known, hits) : [];
  const anyPlace = shown.some((entry) => entry.kind === "place");

  const choose = (entry: VenueSuggestion) => {
    const name = (entry.kind === "known" ? entry.name : entry.hit.name).slice(0, VENUE_MAX).trim();
    setPicked(name);
    setOpen(false);
    setActive(-1);
    onPick(name, entry.kind === "place" ? entry.hit : undefined);
  };

  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (shown.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((at) => (at + step + shown.length) % shown.length);
    } else if (event.key === "Enter" && open && shown[active]) {
      event.preventDefault();
      choose(shown[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  const optionId = (at: number) => `${listId}-${at}`;
  return (
    <div className="venue-field">
      <label className="field">
        <small>Venue</small>
        <input
        {...field}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shown.length > 0}
        aria-controls={listId}
        aria-activedescendant={active >= 0 && shown[active] ? optionId(active) : undefined}
        value={value}
        maxLength={VENUE_MAX}
        placeholder="Search for a place"
        autoComplete="off"
        enterKeyHint="search"
        onFocus={() => setOpen(true)}
        // The sheet may focus the field before a tap; the tap still opens the list.
        onClick={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
        }}
        onKeyDown={keys}
        onChange={(event) => {
          setPicked(null);
          setOpen(true);
          setActive(-1);
          onType(event.target.value);
        }}
        />
      </label>
      {error}
      <div className="venue-hits" hidden={shown.length === 0}>
        <ul id={listId} role="listbox" aria-label="Venues" className="psearch-hits">
          {shown.map((entry, at) => (
            <li
              key={entry.kind === "known" ? `k|${entry.name}` : `p|${entry.hit.name}|${entry.hit.area ?? ""}|${entry.hit.lat}`}
              id={optionId(at)}
              role="option"
              aria-selected={at === active}
              // Keeps focus in the field, so the blur does not close the list before the pick.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(entry)}
            >
              {entry.kind === "known" ? (
                <b>{entry.name}</b>
              ) : (
                <>
                  <b>{entry.hit.name}</b>
                  {entry.hit.area && <span> · {entry.hit.area}</span>}
                </>
              )}
            </li>
          ))}
        </ul>
        {anyPlace && <p className="psearch-credit">Search by Photon · © OpenStreetMap</p>}
      </div>
    </div>
  );
}
