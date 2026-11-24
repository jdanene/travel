import { useEffect, useState } from "react";
import { Icon } from "../../../components/Icon";
import type { WriteResult } from "../../../lib/db";
import { byTagName } from "../lib/tags";

interface EventTagsProps {
  /** The event's showId; a new event clears the last problem. */
  showId: string;
  /** The event's tags. */
  tags: string[];
  /** Every tag the trip has: tag → name. */
  names: Record<string, string>;
  /** Puts a tag on the event or takes it off. Absent on a device that has not joined: the tags only show. */
  onChange?: (tag: string, on: boolean) => Promise<WriteResult>;
}

/**
 * The "Tags" part of the show sheet (owner, 24 Nov 2026: "I need to be
 * able to add or remove tags from events"; a new tag is made with the "+"
 * beside the filter chips, not here): the event's tags as filled chips
 * with a remove mark, then the trip's other tags to add with one tap. Each
 * tap writes at once; the list, the chips and the map follow through the
 * one listener.
 *
 * Inputs: the event, its tags, the trip's tag names, and the write.
 * Output: the part. Without a write (a device that has not joined) it
 * shows the tags alone, or nothing when the event has none. A refused or
 * failed write shows one line; the listener already put the data back.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   Peggy Gou, tagged Big nights → "Big nights ×"; tap it → "No tags yet." and "+ Big nights" under "Add a tag"
 *   tap "+ Rooftop"              → "Rooftop ×" on the event; its row shows a grey "Rooftop"
 */
export function EventTags({ showId, tags, names, onChange }: EventTagsProps) {
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => setProblem(null), [showId]);

  const on = [...tags].sort(byTagName(names));
  const others = Object.keys(names)
    .filter((tag) => !on.includes(tag))
    .sort(byTagName(names));

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

  const run = (tag: string, isOn: boolean) => {
    setProblem(null);
    void onChange(tag, isOn).then((result) => {
      if (!result.ok) setProblem(result.reason === "refused" ? "Join the trip to change tags." : "No connection");
    });
  };

  return (
    <section className="event-tags" aria-labelledby="event-tags-head">
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
    </section>
  );
}
