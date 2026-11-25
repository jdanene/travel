import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { Icon, type IconName } from "../../../components/Icon";
import type { Reply } from "../../../types/trip";
import { REPLIES } from "../lib/crew";
import { burst } from "./confetti";
import "./ReplyCircles.css";

const ICONS: Record<Reply, IconName> = { in: "check", maybe: "ask", out: "close" };

/** How long a finger rests on another circle to change a reply: Zen's habit stone (habitHoldMs). */
const HOLD_MS = 650;
/** A finger that drifts further than this is scrolling or sliding off, not holding. */
const SLOP_PX = 8;

/** Gives the phone's short buzz; a browser without it, or one that refuses it, never blocks the pick. */
function buzz() {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* No haptics here. */
  }
}

/**
 * I'm in / Maybe / Can't as three circles with the word under each, in
 * their meaning's colour (owner, 25 Nov 2026: "semantic colors like im in
 * is green", "circles not squares"): a pale tint at rest, the full colour,
 * slightly raised, with a light ring when picked. The invitation and the
 * home page both use it.
 *
 * The first reply is one tap. Changing a reply takes a short hold on
 * another circle (owner, 25 Nov 2026: "put a little fiction on changing
 * intiial chooice", after Zen's habit stone): a ring in that circle's
 * colour fills for 650 ms, then the reply changes with a short buzz.
 * Releasing early, sliding off, moving more than 8 px (a scroll), a second
 * finger, leaving the window, a hidden page or a reply that changes on
 * another device all cancel the hold. A quick tap on another circle changes
 * nothing; that circle shakes and "Hold to change" under the circles lights
 * up, so a fast tapper learns the rule. Enter, Space and screen-reader
 * activation change the reply at once; a held key does not repeat it.
 * Tapping the circle already picked does nothing. Holding "I'm in" when
 * you are already in celebrates: the ring fills, the phone buzzes and the
 * confetti falls again; nothing is saved (owner, 25 Nov 2026).
 *
 * Inputs: picked — this member's reply, if any; onPick — what a committed
 * pick does (open the join sheet, or save the reply).
 * Output: the group, heard as "Your reply", each circle a toggle button
 * described by "Hold to change" once a reply exists; onPick is called only
 * for a reply other than the picked one.
 * Examples (checked on the emulator at 390 px and 1650 px):
 *   no reply, tap "I'm in"           → onPick("in") at once (the join sheet, for a newcomer)
 *   picked "in", tap "Maybe"         → no change; Maybe shakes, "Hold to change" lights up
 *   picked "in", hold "Maybe" 650 ms → the ring fills, onPick("maybe")
 *   picked "in", release at 300 ms   → no change
 *   picked "in", focus Maybe, Enter  → onPick("maybe") at once
 *   picked "in", hold "I'm in" 650 ms → the ring fills, a buzz and confetti; onPick is not called
 */
export function ReplyCircles({ picked, onPick }: { picked: Reply | undefined; onPick: (reply: Reply) => void }) {
  const hintId = useId();
  const [holding, setHolding] = useState<Reply | null>(null);
  const [nudge, setNudge] = useState<{ reply: Reply; odd: boolean } | null>(null);
  const latest = useRef({ picked, onPick });
  latest.current = { picked, onPick };
  // cheer: a hold on "I'm in" by a friend who is already in; it celebrates and saves nothing.
  const hold = useRef<{ reply: Reply; pointerId: number; x: number; y: number; timer: number; cheer: boolean } | null>(null);
  // Set on a pointer press with no reply yet, so the click that follows is that first tap.
  const tapArmed = useRef(false);

  const commit = useCallback((reply: Reply) => {
    if (reply === latest.current.picked) return;
    buzz();
    setNudge(null);
    latest.current.onPick(reply);
  }, []);

  const cancel = useCallback(() => {
    if (hold.current) window.clearTimeout(hold.current.timer);
    hold.current = null;
    setHolding(null);
  }, []);

  // Leaving the window, a hidden page or unmounting ends a hold; a reply landing from another device ends it too.
  useEffect(() => {
    const hidden = () => document.visibilityState === "hidden" && cancel();
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cancel();
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [cancel]);
  useEffect(() => {
    if (hold.current && (hold.current.cheer || picked === undefined || picked === hold.current.reply)) cancel();
  }, [picked, cancel]);

  const down = (reply: Reply) => (event: PointerEvent<HTMLButtonElement>) => {
    // A second finger, or a second press anywhere, is not a deliberate hold.
    if (hold.current || !event.isPrimary || event.button !== 0) return cancel();
    tapArmed.current = picked === undefined;
    const cheer = picked === reply && reply === "in";
    if (picked === undefined || (picked === reply && !cheer)) return;
    const timer = window.setTimeout(() => {
      hold.current = null;
      setHolding(null);
      if (!cheer) return commit(reply);
      buzz();
      burst();
    }, HOLD_MS);
    hold.current = { reply, pointerId: event.pointerId, x: event.clientX, y: event.clientY, timer, cheer };
    setHolding(reply);
  };

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const start = hold.current;
    if (start && event.pointerId === start.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > SLOP_PX) cancel();
  };

  // Lifting the finger before the ring is full: no change, and a nudge that teaches the hold.
  const up = (event: PointerEvent<HTMLButtonElement>) => {
    const start = hold.current;
    if (!start || event.pointerId !== start.pointerId) return;
    cancel();
    // An early release on your own "I'm in" is just a tap: no nudge.
    if (!start.cheer) setNudge((last) => ({ reply: start.reply, odd: !last?.odd }));
  };

  // A click with no pointer behind it (detail 0) is a key or a screen reader: it picks at once.
  const click = (reply: Reply) => (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0 || tapArmed.current) commit(reply);
    tapArmed.current = false;
  };

  const key = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
  };

  return (
    <div className="reply-pick">
      <div className="reply-circles" role="group" aria-label="Your reply">
        {REPLIES.map(({ reply, label, tone }) => (
          <button
            key={reply}
            type="button"
            data-tone={tone}
            data-holding={holding === reply || undefined}
            data-nudge={nudge?.reply === reply ? (nudge.odd ? "a" : "b") : undefined}
            aria-pressed={picked === reply}
            aria-describedby={picked ? hintId : undefined}
            onPointerDown={down(reply)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerLeave={cancel}
            onPointerCancel={cancel}
            onContextMenu={(event) => event.preventDefault()}
            onBlur={cancel}
            onKeyDown={key}
            onClick={click(reply)}
          >
            <span className="rc-hold">
              <span className="rc-dot">
                <Icon name={ICONS[reply]} size={24} />
              </span>
              {holding === reply && (
                <svg className="rc-ring" viewBox="0 0 48 48" aria-hidden="true">
                  <circle cx="24" cy="24" r="22.5" pathLength="100" />
                </svg>
              )}
            </span>
            <span className="rc-word">{label}</span>
          </button>
        ))}
      </div>
      {picked && (
        <p id={hintId} className="rc-hint" data-nudge={nudge ? (nudge.odd ? "a" : "b") : undefined}>
          Hold to change
        </p>
      )}
    </div>
  );
}
