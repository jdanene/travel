import { useState } from "react";
import type { EventsFilter } from "../lib/big";

/** Where this device keeps its choice; one key for every trip. */
const STORE = "travel.eventsFilter";

/**
 * The Events filter this device last picked, kept in localStorage so the
 * list opens as the friend left it. "big" until "All" is picked here. A
 * browser that refuses storage (some private modes) keeps the choice for
 * this visit only.
 *
 * Inputs: none.
 * Output: the filter and a way to change it.
 * Examples (checked on the emulator): pick "All", reload, open Events → "All" is picked
 */
export function useEventsFilter(): [EventsFilter, (next: EventsFilter) => void] {
  const [filter, setFilter] = useState<EventsFilter>(() => {
    try {
      return localStorage.getItem(STORE) === "all" ? "all" : "big";
    } catch {
      return "big";
    }
  });
  const choose = (next: EventsFilter) => {
    setFilter(next);
    try {
      localStorage.setItem(STORE, next);
    } catch {
      // The choice still holds until the page closes.
    }
  };
  return [filter, choose];
}

interface EventsFilterChipsProps {
  filter: EventsFilter;
  /** Every event of the trip, whatever the filter. */
  total: number;
  onChoose: (next: EventsFilter) => void;
}

/**
 * The quiet control at the top of the Events list: two chips, "Big nights"
 * and "All · 27", the picked one filled. Screen readers hear "All 27".
 *
 * Inputs: the filter, how many events the trip has, and what a tap does.
 * Output: the two chips.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   first visit  → "Big nights" filled, "All · 27" outlined
 *   tap "All"    → "All · 27" filled, every venue listed
 */
export function EventsFilterChips({ filter, total, onChoose }: EventsFilterChipsProps) {
  return (
    <div className="pills parties-filter" role="group" aria-label="Which events">
      <button type="button" className="pill" aria-pressed={filter === "big"} onClick={() => onChoose("big")}>
        Big nights
      </button>
      <button type="button" className="pill" aria-pressed={filter === "all"} onClick={() => onChoose("all")}>
        All<span aria-hidden="true"> ·</span> {total}
      </button>
    </div>
  );
}
