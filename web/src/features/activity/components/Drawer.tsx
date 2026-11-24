import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";

interface DrawerProps {
  open: boolean;
  /** The panel's name for screen readers ("Add a reaction"). */
  label: string;
  /** Called on Escape, a tap outside, or a drag down far or fast enough. */
  onClose: () => void;
  /** The button that opened it: on a desktop the panel sits beside it, as Discord's does. */
  anchor?: RefObject<HTMLElement>;
  /** A selector for what takes focus on a desktop (the search field); on a phone the panel takes it, so no keyboard jumps up. */
  focusOnDesk?: string;
  children: ReactNode;
}

const DESK = "(min-width: 900px) and (hover: hover)";
/** How far (share of its height) or how fast (px per ms) a drag must go to close the sheet. */
const CLOSE_SHARE = 0.3;
const CLOSE_SPEED = 0.5;
/** Matches the CSS: the panel's own transition, plus a little. */
const SETTLE_MS = 480;

/**
 * The dark panel the emoji, GIF and reaction pickers live in. On a phone
 * it is a bottom sheet with a grab handle that springs up, follows the
 * finger, and closes when dragged down far or fast; on a desktop it is a
 * popover beside the button that opened it. Both are a modal <dialog>, so
 * focus stays inside, Escape closes it, and focus goes back to the button.
 * Motion is transform and opacity only; reduced motion fades.
 *
 * Inputs: open, label, onClose, anchor, focusOnDesk, and the content.
 * Output: the panel while open or closing; nothing otherwise.
 * Examples (checked on screen at 375 px and 1650 px):
 *   open on a phone        → the sheet rises from the foot; a quick flick down on the handle closes it
 *   open on a desktop      → a popover above the button, the search field focused; Escape closes it
 */
export function Drawer({ open, label, onClose, anchor, focusOnDesk, children }: DrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [place, setPlace] = useState<React.CSSProperties>({});
  const drag = useRef<{ y: number; at: number; lastY: number; lastAt: number; dy: number } | null>(null);

  if (open && !mounted) setMounted(true);

  // Open: show the dialog, then on the next frame let the panel move in.
  useLayoutEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    if (!node.open) node.showModal();
    setPlace(placeBeside(anchor?.current ?? null));
    const desk = window.matchMedia(DESK).matches;
    const target = desk && focusOnDesk ? node.querySelector<HTMLElement>(focusOnDesk) : null;
    (target ?? panel.current)?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(frame);
  }, [open, anchor, focusOnDesk]);

  // Close: let the panel move out, then close the dialog and drop the content.
  useEffect(() => {
    if (open || !mounted) return;
    setShown(false);
    const done = window.setTimeout(() => {
      dialog.current?.close();
      setMounted(false);
    }, SETTLE_MS);
    return () => window.clearTimeout(done);
  }, [open, mounted]);

  // A desktop popover follows its button when the window changes size.
  useEffect(() => {
    if (!open) return;
    const follow = () => setPlace(placeBeside(anchor?.current ?? null));
    window.addEventListener("resize", follow);
    return () => window.removeEventListener("resize", follow);
  }, [open, anchor]);

  const startDrag = (event: ReactPointerEvent) => {
    if (window.matchMedia(DESK).matches || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, at: event.timeStamp, lastY: event.clientY, lastAt: event.timeStamp, dy: 0 };
    panel.current?.classList.add("dragging");
  };
  const moveDrag = (event: ReactPointerEvent) => {
    const state = drag.current;
    if (!state || !panel.current) return;
    const raw = event.clientY - state.y;
    // Down follows the finger; up resists, as a sheet at its full height does.
    state.dy = raw >= 0 ? raw : raw * 0.2;
    if (event.timeStamp - state.lastAt > 16) {
      state.lastY = event.clientY;
      state.lastAt = event.timeStamp;
    }
    panel.current.style.transform = `translate3d(0, ${state.dy}px, 0)`;
  };
  const endDrag = (event: ReactPointerEvent) => {
    const state = drag.current;
    const node = panel.current;
    drag.current = null;
    if (!state || !node) return;
    node.classList.remove("dragging");
    const speed = (event.clientY - state.lastY) / Math.max(1, event.timeStamp - state.lastAt);
    if (state.dy > node.offsetHeight * CLOSE_SHARE || (speed > CLOSE_SPEED && state.dy > 8)) {
      // Carry on down from where the finger let go; the inline transform goes with the panel.
      node.style.transform = "translate3d(0, 100%, 0)";
      onClose();
    } else node.style.transform = "";
  };

  if (!mounted) return null;
  return (
    <dialog
      ref={dialog}
      className={`drawer${shown ? " shown" : ""}`}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div ref={panel} className="drawer-panel" style={place} tabIndex={-1}>
        <div className="drawer-grab" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <span aria-hidden="true" />
        </div>
        {children}
      </div>
    </dialog>
  );
}

/**
 * Where a desktop popover sits: above its button when there is room, else
 * below, its left edge on the button's and kept inside the window. On a
 * phone the CSS places the sheet and this gives nothing.
 * Inputs: the button. Output: inline left/top/bottom for the panel.
 * Examples (checked on screen at 1650 px): the message bar's emoji button → the popover's foot 8 px above it, its right edge on the button's
 */
function placeBeside(button: HTMLElement | null): React.CSSProperties {
  if (!button || !window.matchMedia(DESK).matches) return {};
  const box = button.getBoundingClientRect();
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const width = 26 * rem;
  const height = Math.min(30 * rem, window.innerHeight * 0.7);
  const left = Math.max(12, Math.min(box.right - width, window.innerWidth - width - 12));
  if (box.top - 8 >= height + 12) return { left, bottom: window.innerHeight - box.top + 8 };
  return { left, top: Math.min(box.bottom + 8, window.innerHeight - height - 12) };
}
