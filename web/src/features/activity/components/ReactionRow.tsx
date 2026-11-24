import { useEffect, useRef, type ReactNode } from "react";
import type { ActivityReactions, MemberId } from "../../../types/trip";
import { groupReactions, type ReactionPill } from "../lib/reactions";
import { Glyph } from "./Glyph";

interface ReactionRowProps {
  raw: ActivityReactions | undefined;
  memberId: MemberId;
  names: Record<MemberId, string>;
  /** Adds (true) or takes off (false) one of this member's emoji. */
  onToggle: (key: string, on: boolean) => void;
  /** Opens the reaction panel beside the given button. */
  onAdd: (button: HTMLButtonElement) => void;
  /** Sits at the row's end, on the same line: a post's "Reply". */
  after?: ReactNode;
}

/**
 * The emoji under a Feed line, as on Discord: a pill per emoji with its
 * count (yours tinted with the accent; a tap adds or takes yours off),
 * then a small add-reaction pill. A line with no emoji keeps only that
 * small, quiet pill, so the feed stays tight but the way in is visible.
 * Counts roll when they change. Hovering a pill names who reacted.
 *
 * Inputs: the line's reactions as stored, this member, the names, what a
 * tap and the add pill do, and what sits after.
 * Output: the row.
 * Examples (checked on the emulator with two profiles):
 *   🔥 from KA and RB, you are RB → "🔥 2" tinted; a tap → "🔥 1", not tinted
 *   no emoji                      → just the small smiley-plus pill
 */
export function ReactionRow({ raw, memberId, names, onToggle, onAdd, after }: ReactionRowProps) {
  const pills = groupReactions(raw, memberId);
  return (
    <div className={`rx${pills.length ? " has" : ""}`}>
      {pills.map((pill) => (
        <Pill key={pill.key} pill={pill} names={names} memberId={memberId} onToggle={onToggle} />
      ))}
      <button type="button" className="rx-add" aria-label="Add a reaction" title="Add a reaction" onClick={(event) => onAdd(event.currentTarget)}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="i">
          <path d="M20.5 11.5A8.5 8.5 0 1 1 12.5 3.5" />
          <path d="M8.5 14.5c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8M9 9.8v.4M15 9.8v.4" />
          <path d="M19 2.5v5M16.5 5h5" />
        </svg>
      </button>
      {after}
    </div>
  );
}

/** One pill; its count rolls up when it grows and down when it shrinks. */
function Pill({ pill, names, memberId, onToggle }: { pill: ReactionPill; names: Record<MemberId, string>; memberId: MemberId; onToggle: (key: string, on: boolean) => void }) {
  const count = pill.who.length;
  const last = useRef(count);
  const way = count > last.current ? "up" : count < last.current ? "down" : "";
  useEffect(() => {
    last.current = count;
  }, [count]);
  const what = pill.choice.kind === "emoji" ? pill.choice.char : `:${pill.choice.emote.name}:`;
  const who = pill.who.map((id) => (id === memberId ? "you" : names[id] ?? id)).join(", ");
  return (
    <button
      type="button"
      className={`rx-pill${pill.mine ? " mine" : ""}`}
      aria-pressed={pill.mine}
      aria-label={`${what} ${count}: ${who}`}
      title={`${who} reacted with ${what}`}
      onClick={() => onToggle(pill.key, !pill.mine)}
    >
      <Glyph choice={pill.choice} />
      <span className="rx-n" aria-hidden="true">
        <span key={count} className={way}>
          {count}
        </span>
      </span>
    </button>
  );
}
