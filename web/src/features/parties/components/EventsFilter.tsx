import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "../../../components/Icon";
import type { WriteResult } from "../../../lib/db";
import { pickFilter, tagSlug, type EventsFilter, type TagChip } from "../lib/tags";

/** Where this device keeps its choice; one key for every trip. */
const STORE = "travel.eventsFilter";

/**
 * The Events filter this device last picked, kept in localStorage so the
 * list and the map open as the friend left them. The pick holds while its
 * chip exists; else "Big nights", else "All" (pickFilter). A browser that
 * refuses storage (some private modes) keeps the choice for this visit only.
 *
 * Inputs: chips — the trip's tag chips.
 * Output: the filter and a way to change it.
 * Examples (checked on the emulator): pick "All", reload, open Events → "All" is picked
 */
export function useEventsFilter(chips: TagChip[]): [EventsFilter, (next: EventsFilter) => void] {
  const [stored, setStored] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORE);
    } catch {
      return null;
    }
  });
  const choose = (next: EventsFilter) => {
    setStored(next);
    try {
      localStorage.setItem(STORE, next);
    } catch {
      // The choice still holds until the page closes.
    }
  };
  return [pickFilter(stored, chips), choose];
}

interface EventsFilterChipsProps {
  filter: EventsFilter;
  chips: TagChip[];
  /** Every event of the trip, whatever the filter. */
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
      <div className="pills parties-filter" role="group" aria-label="Which events">
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
