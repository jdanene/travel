import { nights, stayLength } from "../../../lib/format";
import { useState, type FormEvent } from "react";
import { Calendar, dayLabel } from "../../../components/Calendar";
import { Sheet } from "../../../components/Sheet";
import type { TripInfo } from "../../../types/trip";
import { checkDates } from "../lib/dates";

interface AddDatesSheetProps {
  open: boolean;
  /** The trip's season; its first month is where the calendar opens. */
  season: TripInfo["season"];
  onClose: () => void;
  /** Adds the option and votes Yes; resolves once the write is done. */
  onAdd: (from: string, to: string) => Promise<void>;
}

/**
 * "Add dates": a friend's own range, in the pattern of the Add a party
 * sheet (20/8). The shared calendar (components/Calendar.tsx), open in the
 * sheet: the first tap is From, the second is To, and the line under it
 * says both days and the nights. Any day of any month and year can be
 * picked (owner, 24 Nov 2026); it opens on the season's first month. "Add"
 * says what is missing when a day is not picked yet.
 *
 * Inputs: whether it is open, the season, and what closing and
 * adding do.
 * Output: the sheet. On a good Add it closes; the option shows for
 * everyone with this friend's Yes.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   tap 18, tap 24, Add        → the sheet closes; "Thu 18 – Wed 24 Feb" shows, sorted by its start, "added by you"
 *   tap 13, Add                → "Pick the last day." under the calendar
 *   Previous month, tap 28 Jan → January can be picked
 */
export function AddDatesSheet({ open, season, onClose, onAdd }: AddDatesSheetProps) {
  return (
    <Sheet open={open} title="Add dates" onClose={onClose}>
      {open && <DatesForm season={season} onAdd={onAdd} />}
    </Sheet>
  );
}

function DatesForm({ season, onAdd }: Pick<AddDatesSheetProps, "season" | "onAdd">) {
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = checkDates(draft);
    setError(found.from ?? found.to);
    if (found.from || found.to) return;
    setSaving(true);
    await onAdd(draft.from, draft.to);
    setSaving(false);
  };

  const picked = draft.from ? `${dayLabel(draft.from)} – ${draft.to ? dayLabel(draft.to) : "pick the last day"}` : "Pick the first day, then the last.";
  return (
    <form className="dates-sheet" onSubmit={(event) => void submit(event)} noValidate>
      <Calendar
        label="From and to"
        from={draft.from}
        to={draft.to}
        startMonth={season?.from?.slice(0, 7)}
        onPick={(from, to) => {
          setDraft({ from, to });
          setError(undefined);
        }}
      />
      <p className="cap dates-picked" aria-live="polite">
        {picked}
        {draft.from && draft.to && <> · {stayLength(nights(draft.from, draft.to))}</>}
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn" style={{ marginTop: 6 }} disabled={saving} aria-busy={saving}>
        Add
      </button>
    </form>
  );
}
