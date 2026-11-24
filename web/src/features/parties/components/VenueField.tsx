import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import "../../../components/PlaceSearch.css";
import { Icon } from "../../../components/Icon";
import type { Spot } from "../../../lib/placeSearch";
import { usePlaceHits } from "../../../lib/usePlaceHits";
import { venueSuggestions, type VenueSpot, type VenueSuggestion } from "../lib/venues";
import { VenueIcon } from "./VenueIcon";

/** The longest venue the rules take, for a show and for a place on the map. */
export const VENUE_MAX = 60;

interface VenueFieldProps {
  /** The field's words, as the draft holds them. */
  value: string;
  /** Every venue the trip knows, in every destination. */
  known: VenueSpot[];
  /** Names a destination with its country: "Bali, Indonesia". */
  placeOf: (destination: string) => string;
  /** Gives the point the search leans toward. */
  near: () => Spot;
  /** The trip's destination centres; matches near them come first. */
  region: Spot[];
  /** The friend typed; nothing is picked until a line is chosen. */
  onType: (words: string) => void;
  /** The friend chose a line: a known venue, a place from the search, or the typed words as a new venue. */
  onPick: (line: VenueSuggestion) => void;
  /** Puts the caret in the field when the sheet opens to add. */
  autoFocus?: boolean;
  /** The refusal under the field, if any. */
  error?: ReactNode;
  name?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * Add an event's search, the first thing in the sheet, used like a web
 * search box: one field, "Search for a venue or place", and its list.
 * Nothing typed lists every venue the trip knows, clubs first, each with
 * its place, "Savaya · Bali, Indonesia". Words typed list the known
 * venues that match, then places anywhere in the world from the shared
 * place search, "Bottle Beach 1 · Haad Khuat, Thailand", then always
 * 'Add "…" as a new venue' last (lib/venues.ts). Arrow keys move through
 * the list, Enter picks, Escape closes it. When the search fails, is slow
 * or the friend is offline, the known venues and the add line still show;
 * nothing else is said.
 *
 * Inputs: the words, the known venues and how to name their places, the
 * search's point and region, what typing and picking do, and the field's
 * error wiring.
 * Output: the field and its suggestions.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   open Add an event           → the caret in the field; Savaya · Bali, Indonesia … clubs first
 *   "bottle"                    → "Bottle Beach 1 · Haad Khuat, Thailand" and more, then Add "bottle" as a new venue
 *   offline, "haad rin pier"    → Add "haad rin pier" as a new venue, nothing else
 */
export function VenueField({ value, known, placeOf, near, region, onType, onPick, autoFocus, error, ...field }: VenueFieldProps) {
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
    const name = (entry.kind === "known" ? entry.venue.name : entry.kind === "place" ? entry.hit.name : entry.name).slice(0, VENUE_MAX).trim();
    setPicked(name);
    setOpen(false);
    setActive(-1);
    onPick(entry.kind === "place" ? { kind: "place", hit: { ...entry.hit, name } } : entry.kind === "known" ? entry : { kind: "new", name });
  };

  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (shown.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      // From no line, Up goes to the last line (the add line) and Down to the first.
      setActive((at) => (at < 0 ? (step > 0 ? 0 : shown.length - 1) : (at + step + shown.length) % shown.length));
    } else if (event.key === "Enter" && open && shown[active]) {
      event.preventDefault();
      choose(shown[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setActive(-1);
    }
  };

  const optionId = (at: number) => `${listId}-${at}`;
  return (
    <div className="venue-field">
      <label className="field venue-search">
        <Icon name="search" size={20} />
        <input
          {...field}
          type="search"
          role="combobox"
          aria-label="Venue"
          aria-autocomplete="list"
          aria-expanded={shown.length > 0}
          aria-controls={listId}
          aria-activedescendant={active >= 0 && shown[active] ? optionId(active) : undefined}
          value={value}
          maxLength={VENUE_MAX}
          placeholder="Search for a venue or place"
          autoComplete="off"
          autoFocus={autoFocus}
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
              key={entry.kind === "known" ? `k|${entry.venue.destination}|${entry.venue.name}` : entry.kind === "place" ? `p|${entry.hit.name}|${entry.hit.area ?? ""}|${entry.hit.lat}` : "new"}
              id={optionId(at)}
              role="option"
              aria-selected={at === active}
              className={entry.kind === "new" ? "venue-new" : undefined}
              // Keeps focus in the field, so the blur does not close the list before the pick.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(entry)}
            >
              {entry.kind === "known" ? (
                <>
                  <VenueIcon url={entry.venue.photoUrl} fallback={<span className="venue-tile"><Icon name="music" size={18} /></span>} />
                  <span className="venue-words">
                    <b>{entry.venue.name}</b>
                    <span>{placeOf(entry.venue.destination)}</span>
                  </span>
                </>
              ) : entry.kind === "place" ? (
                <>
                  <span className="venue-tile"><Icon name="pin" size={18} /></span>
                  <span className="venue-words">
                    <b>{entry.hit.name}</b>
                    {entry.hit.area && <span>{entry.hit.area}</span>}
                  </span>
                </>
              ) : (
                <>
                  <span className="venue-tile"><Icon name="plus" size={18} /></span>
                  <span className="venue-words">
                    <b>Add "{entry.name.slice(0, VENUE_MAX)}" as a new venue</b>
                  </span>
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
