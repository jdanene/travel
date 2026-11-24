import { createElement, useEffect, useRef } from "react";
import "emoji-picker-element";
import dataUrl from "emoji-picker-element-data/en/emojibase/data.json?url";
import { Sheet } from "../../../components/Sheet";
import type { MemberId } from "../../../types/trip";

interface ReactionsProps {
  /** This line's emoji: member id to emoji. */
  marks: Record<MemberId, string> | undefined;
  memberId: MemberId;
  names: Record<MemberId, string>;
  /** Sets this member's emoji; null takes it off. */
  onReact: (emoji: string | null) => void;
  /** Opens the picker for this line. */
  onPick: () => void;
}

/**
 * The emoji under one Feed line: a chip for each emoji with its count, the
 * member's own pressed, and a small button that opens the picker. A tap on
 * a chip puts that emoji on; a tap on your own takes it off.
 *
 * Inputs: the line's emoji, this member, the names (for the chip's label),
 * and what reacting and opening the picker do.
 * Output: the row.
 * Examples (checked on screen): 🔥 from KA and RB, you are RB → "🔥 2" pressed, then the add button
 */
export function Reactions({ marks, memberId, names, onReact, onPick }: ReactionsProps) {
  const groups = new Map<string, MemberId[]>();
  Object.entries(marks ?? {}).forEach(([who, emoji]) => groups.set(emoji, [...(groups.get(emoji) ?? []), who]));
  const mine = marks?.[memberId];
  return (
    <div className="rx">
      {[...groups].map(([emoji, who]) => (
        <button
          key={emoji}
          type="button"
          className="rx-chip"
          aria-pressed={mine === emoji}
          aria-label={`${emoji} ${who.map((id) => names[id] ?? id).join(", ")}`}
          onClick={() => onReact(mine === emoji ? null : emoji)}
        >
          <span>{emoji}</span>
          {who.length}
        </button>
      ))}
      <button type="button" className="rx-add" aria-label="Add an emoji" onClick={onPick}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 14.5c.9 1.2 2.1 1.8 3.5 1.8s2.600-.6 3.500-1.800M9 9.800v.4M15 9.800v.4" />
        </svg>
      </button>
    </div>
  );
}

/**
 * The emoji picker, in a sheet: every emoji, with search and skin tones.
 * Its data file is served by this site, not a third party.
 *
 * Inputs: whether it is open, what a pick does, and what closing does.
 * Output: the sheet; a pick closes it.
 * Examples (checked on screen): type "fire", tap 🔥 → onPick("🔥"), the sheet closes
 */
export function EmojiSheet({ open, onPick, onClose }: { open: boolean; onPick: (emoji: string) => void; onClose: () => void }) {
  const picker = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const node = picker.current;
    if (!node) return;
    const pick = (event: Event) => {
      const emoji = (event as CustomEvent<{ unicode?: string }>).detail.unicode;
      if (emoji) onPick(emoji);
    };
    node.addEventListener("emoji-click", pick);
    return () => node.removeEventListener("emoji-click", pick);
  });
  return (
    <Sheet open={open} title="Add an emoji" onClose={onClose}>
      {createElement("emoji-picker", { ref: picker, class: "light rx-picker", "data-source": dataUrl })}
    </Sheet>
  );
}
