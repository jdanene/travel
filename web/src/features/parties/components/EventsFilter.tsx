import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { Icon } from "../../../components/Icon";
import type { WriteResult } from "../../../lib/db";
import { pickCountry, type CountryFilter } from "../lib/countries";
import { pickFilter, tagSlug, type EventsFilter, type TagChip } from "../lib/tags";

/**
 * A choice this device keeps in localStorage under one key for every trip.
 * A browser that refuses storage (some private modes) keeps the choice for
 * this visit only.
 *
 * Inputs: key — the localStorage key.
 * Output: the stored value (null when none or refused) and a way to change it.
 * Examples (checked on the emulator): choose("all"), reload → "all"
 */
function useStoredChoice(key: string): [string | null, (next: string) => void] {
  const [stored, setStored] = useState<string | null>(() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  });
  const choose = (next: string) => {
    setStored(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      // The choice still holds until the page closes.
    }
  };
  return [stored, choose];
}

/**
 * The Events filter this device last picked, kept so the list opens as the
 * friend left it. The pick holds while its chip exists; else "Big nights",
 * else "All" (pickFilter).
 *
 * Inputs: chips — the trip's tag chips.
 * Output: the filter and a way to change it.
 * Examples (checked on the emulator): pick "All", reload, open Events → "All" is picked
 */
export function useEventsFilter(chips: TagChip[]): [EventsFilter, (next: EventsFilter) => void] {
  const [stored, choose] = useStoredChoice("travel.eventsFilter");
  return [pickFilter(stored, chips), choose];
}

/**
 * The country this device last picked in Events, kept like the tag filter.
 * The pick holds while its chip exists and there are two chips or more;
 * else "All countries" (pickCountry).
 *
 * Inputs: chips — countryChips() of the trip.
 * Output: the country and a way to change it.
 * Examples (checked on the emulator at 390 px): pick "Thailand", reload, open Events → "Thailand" is picked
 */
export function useEventsCountry(chips: string[]): [CountryFilter, (next: CountryFilter) => void] {
  const [stored, choose] = useStoredChoice("travel.eventsCountry");
  return [pickCountry(stored, chips), choose];
}

/**
 * On a phone a chip row scrolls: keeps its picked chip in sight after a
 * pick, or after the row's chips change.
 *
 * Inputs: row — the row's element; picked — what is picked; count — how many chips the row has.
 * Output: none; it scrolls the row.
 * Examples (checked on the emulator at 390 px): "Singapore" remembered, open Events → the row starts scrolled to Singapore
 */
function usePickedInView(row: RefObject<HTMLDivElement | null>, picked: string, count: number) {
  useEffect(() => {
    const chip = row.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!chip || !row.current) return;
    const box = row.current.getBoundingClientRect();
    const at = chip.getBoundingClientRect();
    if (at.left < box.left || at.right > box.right) row.current.scrollLeft += at.left - box.left - (box.width - at.width) / 2;
  }, [row, picked, count]);
}

interface CountryChipsProps {
  country: CountryFilter;
  /** countryChips() of the trip; with fewer than two there is no row. */
  countries: string[];
  onChoose: (next: CountryFilter) => void;
}

/**
 * The row above the tag chips (owner, 25 Nov 2026, layout A, "two chip
 * rows"): "All countries", picked by default, then one chip per country
 * that has events or venues, the picked one filled. On a phone the row
 * scrolls sideways in one line. With one country or none there is
 * nothing to filter, and no row.
 *
 * Inputs: the picked country, the countries, what a tap does.
 * Output: the row, heard as the group "Country"; or nothing.
 * Examples (checked on the emulator at 390 px and 1650 px):
 *   events in Bali, Koh Phangan, Phuket and Singapore → All countries (filled), Indonesia, Thailand, Singapore
 *   events in Bali only                              → no row
 */
export function CountryChips({ country, countries, onChoose }: CountryChipsProps) {
  const row = useRef<HTMLDivElement>(null);
  usePickedInView(row, country, countries.length);
  if (countries.length < 2) return null;
  return (
    <div ref={row} className="pills parties-filter" role="group" aria-label="Country">
      <button type="button" className="pill" aria-pressed={country === "all"} onClick={() => onChoose("all")}>
        All countries
      </button>
      {countries.map((name) => (
        <button key={name} type="button" className="pill" aria-pressed={country === name} onClick={() => onChoose(name)}>
          {name}
        </button>
      ))}
    </div>
  );
}

interface EventsFilterChipsProps {
  filter: EventsFilter;
  chips: TagChip[];
  /** The events "All" shows: every event of the trip in the picked country, whatever the tag. */
  total: number;
  onChoose: (next: EventsFilter) => void;
  /** Makes a new tag (places/tagNames); absent on a device that has not joined, and then there is no "+". */
  onMake?: (tag: string, name: string) => Promise<WriteResult>;
}

/**
 * The quiet control at the top of the Events list: one chip per tag the
 * trip has ("Big nights" first), then "All · 27", the picked one filled,
 * then a small "+" (heard as "New tag"; owner, 24 Nov 2026: "we create a
 * new tag by pressing a button next to the existing tabs"). On a phone the
 * row scrolls sideways. "+" opens a short field under the row: the name
 * and "Add". A new tag is picked at once; a name the trip already has picks
 * that tag.
 *
 * Inputs: the filter, the tag chips, how many events the trip has, what a
 * tap does, and how to make a tag.
 * Output: the chips and, while open, the field. Its refusals: "Type a
 * name.", "Use 24 characters or fewer.", "Use letters or numbers.", "Join
 * the trip to make tags." and "No connection".
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   first visit             → "Big nights" filled, "Rooftop", "All · 27" outlined, "+"
 *   "+", type "After dark", Add → an "After dark" chip, picked: "No events tagged yet. Open an event to add it."
 */
export function EventsFilterChips({ filter, chips, total, onChoose, onMake }: EventsFilterChipsProps) {
  const [making, setMaking] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const row = useRef<HTMLDivElement>(null);

  // On a phone the row scrolls: keep the picked chip in sight, a new tag's too.
  usePickedInView(row, filter, chips.length);

  useEffect(() => {
    if (making) field.current?.focus();
  }, [making]);

  const close = () => {
    setMaking(false);
    setDraft("");
    setError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return setError("Type a name.");
    if (name.length > 24) return setError("Use 24 characters or fewer.");
    const tag = tagSlug(name);
    if (!tag) return setError("Use letters or numbers.");
    if (chips.some((chip) => chip.tag === tag) || !onMake) {
      onChoose(tag);
      return close();
    }
    setError(null);
    void onMake(tag, name).then((result) => {
      if (!result.ok) return setError(result.reason === "refused" ? "Join the trip to make tags." : "No connection");
      onChoose(tag);
      close();
    });
  };

  return (
    <>
      <div ref={row} className="pills parties-filter" role="group" aria-label="Which events">
        {chips.map(({ tag, name }) => (
          <button key={tag} type="button" className="pill" aria-pressed={filter === tag} onClick={() => onChoose(tag)}>
            {name}
          </button>
        ))}
        <button type="button" className="pill" aria-pressed={filter === "all"} onClick={() => onChoose("all")}>
          All<span aria-hidden="true"> ·</span> {total}
        </button>
        {onMake && (
          <button type="button" className="pill tag-make" aria-label="New tag" aria-expanded={making} onClick={() => (making ? close() : setMaking(true))}>
            <Icon name="plus" size={16} />
          </button>
        )}
      </div>
      {making && (
        <form className="tags-new" onSubmit={submit} noValidate>
          <label className="field">
            <small>New tag</small>
            <input
              ref={field}
              value={draft}
              maxLength={40}
              autoComplete="off"
              aria-invalid={error !== null}
              aria-describedby={error ? "tags-new-error" : undefined}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && close()}
            />
          </label>
          <button type="submit" className="btn tags-add">
            Add
          </button>
        </form>
      )}
      {making && error && (
        <p className="field-error tags-new-error" id="tags-new-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
