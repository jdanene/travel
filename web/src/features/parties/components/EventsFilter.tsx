import { useState } from "react";
import { pickFilter, type EventsFilter, type TagChip } from "../lib/tags";

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
}

/**
 * The quiet control at the top of the Events list: one chip per tag the
 * venues carry ("Big nights" first), then "All · 27", the picked one
 * filled. Screen readers hear "All 27".
 *
 * Inputs: the filter, the tag chips, how many events the trip has, and what a tap does.
 * Output: the chips; "All" alone when no venue carries a tag.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   first visit        → "Big nights" filled, "Rooftop", "All · 27" outlined
 *   tap "All"          → "All · 27" filled, every venue listed
 */
export function EventsFilterChips({ filter, chips, total, onChoose }: EventsFilterChipsProps) {
  return (
    <div className="pills parties-filter" role="group" aria-label="Which events">
      {chips.map(({ tag, name }) => (
        <button key={tag} type="button" className="pill" aria-pressed={filter === tag} onClick={() => onChoose(tag)}>
          {name}
        </button>
      ))}
      <button type="button" className="pill" aria-pressed={filter === "all"} onClick={() => onChoose("all")}>
        All<span aria-hidden="true"> ·</span> {total}
      </button>
    </div>
  );
}
