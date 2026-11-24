import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "../../../components/Icon";
import type { WriteResult } from "../../../lib/db";
import { BIG, tagSlug } from "../lib/tags";

interface EventTagsProps {
  /** The event's showId; a new event clears the field and the last problem. */
  showId: string;
  /** The event's tags. */
  tags: string[];
  /** Every tag the trip has named: tag → name. */
  names: Record<string, string>;
  /** Puts a tag on the event or takes it off; a new tag comes with its name. Absent on a device that has not joined: the tags only show. */
  onChange?: (tag: string, on: boolean, newName?: string) => Promise<WriteResult>;
}

/** The Big nights tag first, then the rest by name. */
const byName = (names: Record<string, string>) => (a: string, b: string) =>
  Number(b === BIG) - Number(a === BIG) || (names[a] ?? a).localeCompare(names[b] ?? b, "en", { sensitivity: "base" });

/**
 * The "Tags" part of the show sheet (owner, 24 Nov 2026: "I need to be
 * able to add or remove tags from events"; "anyone should be able to add
 * or remove tags"): the event's tags as filled chips with a remove mark,
 * the trip's other tags to add with one tap, and a field that makes a new
 * tag and puts it on the event. Each tap writes at once; the list, the
 * chips above it and the map follow through the one listener.
 *
 * Inputs: the event, its tags, the trip's tag names, and the write.
 * Output: the part. Without a write (a device that has not joined) it
 * shows the tags alone, or nothing when the event has none. A refused or
 * failed write shows one line; the listener already put the data back.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   Peggy Gou, tagged Big nights   → "Big nights ×" under "Tags"; tap it → "No tags yet.", Peggy Gou leaves Big nights
 *   type "Rooftop", tap "Add"      → "Rooftop ×" on the event; a "Rooftop" chip above the Events list
 *   a 25-letter name               → "Use 24 characters or fewer."
 */
export function EventTags({ showId, tags, names, onChange }: EventTagsProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    setDraft("");
    setError(null);
    setProblem(null);
  }, [showId]);

  const on = [...tags].sort(byName(names));
  const others = Object.keys(names)
    .filter((tag) => !on.includes(tag))
    .sort(byName(names));

  if (!onChange) {
    if (on.length === 0) return null;
    return (
      <section className="event-tags" aria-labelledby="event-tags-head">
        <h3 className="tags-head" id="event-tags-head">
          Tags
        </h3>
        <div className="pills">
          {on.map((tag) => (
            <span key={tag} className="tag-label">
              {names[tag] ?? tag}
            </span>
          ))}
        </div>
      </section>
    );
  }

  const run = (tag: string, isOn: boolean, newName?: string) => {
    setProblem(null);
    void onChange(tag, isOn, newName).then((result) => {
      if (!result.ok) setProblem(result.reason === "refused" ? "Join the trip to change tags." : "No connection");
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return setError("Type a name.");
    if (name.length > 24) return setError("Use 24 characters or fewer.");
    const tag = tagSlug(name);
    if (!tag) return setError("Use letters or numbers.");
    setError(null);
    setDraft("");
    // A name the trip already has adds that tag; its name stays as it was.
    if (!on.includes(tag)) run(tag, true, names[tag] === undefined ? name : undefined);
  };

  return (
    <form className="event-tags" onSubmit={submit} noValidate aria-labelledby="event-tags-head">
      <h3 className="tags-head" id="event-tags-head">
        Tags
      </h3>
      {problem && (
        <p className="field-error tags-problem" role="alert">
          {problem}
        </p>
      )}
      {on.length === 0 ? (
        <p className="cap">No tags yet.</p>
      ) : (
        <div className="pills">
          {on.map((tag) => (
            <button key={tag} type="button" className="pill tag-on" aria-label={`Remove ${names[tag] ?? tag}`} onClick={() => run(tag, false)}>
              {names[tag] ?? tag}
              <Icon name="close" size={14} />
            </button>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <>
          <h4 className="tags-head">Add a tag</h4>
          <div className="pills">
            {others.map((tag) => (
              <button key={tag} type="button" className="pill tag-off" aria-label={`Add ${names[tag]}`} onClick={() => run(tag, true)}>
                <Icon name="plus" size={14} />
                {names[tag]}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="tags-new">
        <label className="field">
          <small>New tag</small>
          <input
            value={draft}
            maxLength={40}
            autoComplete="off"
            aria-invalid={error !== null}
            aria-describedby={error ? "tags-new-error" : undefined}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button type="submit" className="btn tags-add">
          Add
        </button>
      </div>
      {error && (
        <p className="field-error" id="tags-new-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
