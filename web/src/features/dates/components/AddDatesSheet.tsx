import { nights, stayLength } from "../../../lib/format";
import { useState, type FormEvent } from "react";
import { DateField } from "../../../components/Calendar";
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
 * sheet (20/8). Two fields, From and To; each opens the shared calendar
 * (components/Calendar.tsx) under it and takes one day. Any day of any
 * month and year can be picked (owner, 24 Nov 2026); From opens on the
 * season's first month, To on From's month. "Add" says what is missing
 * under the field that is wrong.
 *
 * Inputs: whether it is open, the season, and what closing and
 * adding do.
 * Output: the sheet. On a good Add it closes; the option shows for
 * everyone with this friend's Yes.
 * Examples (build and tests only, not yet checked on screen):
 *   From 18 Feb, To 24 Feb, Add → the sheet closes; "Thu 18 – Wed 24 Feb" shows, "added by you"
 *   From 13 Feb, To 10 Feb, Add → "Pick a day on or after From." under To
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
  const [errors, setErrors] = useState<Partial<Record<"from" | "to", string>>>({});
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = checkDates(draft);
    setErrors(found);
    if (found.from || found.to) return;
    setSaving(true);
    await onAdd(draft.from, draft.to);
    setSaving(false);
  };

  // Two fields, From and To, each with its own calendar (owner, 24 Nov 2026: one calendar for both "is not intuitive").
  const field = (name: "from" | "to", label: string) => (
    <DateField
      label={label}
      placeholder="Pick a day"
      from={draft[name]}
      startMonth={(name === "to" && draft.from ? draft.from : season?.from)?.slice(0, 7)}
      onPick={(day) => {
        setDraft((current) => ({ ...current, [name]: day }));
        setErrors((current) => ({ ...current, [name]: undefined }));
      }}
      error={
        errors[name] && (
          <p className="field-error" role="alert">
            {errors[name]}
          </p>
        )
      }
    />
  );
  return (
    <form className="dates-sheet" onSubmit={(event) => void submit(event)} noValidate>
      {field("from", "From")}
      {field("to", "To")}
      {draft.from && draft.to && draft.to >= draft.from && (
        <p className="cap dates-picked" aria-live="polite">
          {stayLength(nights(draft.from, draft.to))}
        </p>
      )}
      <button type="submit" className="btn" style={{ marginTop: 6 }} disabled={saving} aria-busy={saving}>
        Add
      </button>
    </form>
  );
}
