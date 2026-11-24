import { nights, stayLength } from "../../../lib/format";
import { useState, type FormEvent } from "react";
import { Sheet } from "../../../components/Sheet";
import type { TripInfo } from "../../../types/trip";
import { checkDates } from "../lib/dates";

type Field = "from" | "to";

interface AddDatesSheetProps {
  open: boolean;
  season: TripInfo["season"];
  onClose: () => void;
  /** Adds the option and votes Yes; resolves once the write is done. */
  onAdd: (from: string, to: string) => Promise<void>;
}

/**
 * "Add dates": a friend's own range, in the pattern of the Add a party
 * sheet (20/8). Two native date inputs, From and To, any day,
 * and "Add". Add checks both fields first and puts the reason under the
 * wrong one; the typed days stay.
 *
 * Inputs: whether it is open, the season, and what closing and
 * adding do.
 * Output: the sheet. On a good Add it closes; the option shows for
 * everyone with this friend's Yes.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   From 18 Feb, To 24 Feb, Add          → the sheet closes; "Thu 18 – Wed 24 Feb" shows, sorted by its start, "added by you"
 *   From 13 Feb, To 10 Feb, Add          → "Pick a day on or after From." under To
 */
export function AddDatesSheet({ open, onClose, onAdd }: AddDatesSheetProps) {
  return (
    <Sheet open={open} title="Add dates" onClose={onClose}>
      {open && <DatesForm onAdd={onAdd} />}
    </Sheet>
  );
}

function DatesForm({ onAdd }: Pick<AddDatesSheetProps, "onAdd">) {
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);

  const set = (field: Field, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = checkDates(draft);
    setErrors(found);
    const first = (["from", "to"] as Field[]).find((field) => found[field]);
    if (first) return document.getElementById(`dates-${first}`)?.focus();
    setSaving(true);
    await onAdd(draft.from, draft.to);
    setSaving(false);
  };

  const field = (name: Field, label: string) => (
    <div className="dates-field">
      <label className="field">
        <small>{label}</small>
        <input
          id={`dates-${name}`}
          type="date"
          value={draft[name]}
          min={name === "to" && draft.from ? draft.from : undefined}
          aria-invalid={errors[name] ? true : undefined}
          aria-describedby={errors[name] ? `dates-${name}-error` : undefined}
          onChange={(event) => set(name, event.target.value)}
        />
      </label>
      {errors[name] && (
        <p id={`dates-${name}-error`} className="field-error" role="alert">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <form className="dates-sheet" onSubmit={(event) => void submit(event)} noValidate>
      <div className="dates-fields" style={{ marginTop: 6 }}>
        {field("from", "From")}
        {field("to", "To")}
      </div>
      {draft.from && draft.to && draft.to >= draft.from && (
        <p className="cap" aria-live="polite">{stayLength(nights(draft.from, draft.to))}</p>
      )}
      <button type="submit" className="btn" style={{ marginTop: 6 }} disabled={saving} aria-busy={saving}>
        Add
      </button>
    </form>
  );
}
