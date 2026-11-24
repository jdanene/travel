import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

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
  /**
   * On a phone, sit where the keyboard would, as Discord's emoji panel does: no dimming, the page moved up so
   * the anchor's bar and the lines above it stay in view over the panel. The message bar's panel uses it.
   */
  dock?: boolean;
  /** Keep the content in the page while closed (rendered once, when the page is idle), so opening is only the slide. */
  keep?: boolean;
  children: ReactNode;
}

const DESK = "(min-width: 900px) and (hover: hover)";
/** How far (share of its height) or how fast (px per ms) a drag must go to close the sheet. */
const CLOSE_SHARE = 0.3;
const CLOSE_SPEED = 0.5;
/** Matches the CSS: the panel's own transition, plus a little. */
const SETTLE_MS = 480;
/** A docked panel takes about what a keyboard takes: 55 % of the visible screen, never under 280 px. */
const DOCK_SHARE = 0.55;
const DOCK_MIN = 280;
/** The gap between the message bar and a docked panel's top edge. */
const DOCK_GAP = 8;

/**
 * The dark panel the emoji, GIF and reaction pickers live in. On a phone
 * it is a bottom sheet with a grab handle that springs up, follows the
 * finger, and closes when dragged down far or fast; on a desktop it is a
 * popover beside the button that opened it. Both are a modal <dialog>, so
 * focus stays inside, Escape closes it, and focus goes back to the button.
 * A docked panel on a phone (the message bar's) is not modal: it takes the
 * keyboard's place at the foot with no dimming, the page gains room under
 * it and moves up so the bar sits just above it, and a tap outside the
 * panel or Escape closes it. Motion is transform and opacity only; reduced
 * motion fades.
 *
 * Inputs: open, label, onClose, anchor, focusOnDesk, dock, and the content.
 * Output: the panel while open or closing; nothing otherwise.
 * Examples (checked on screen at 375 px and 1650 px):
 *   open on a phone        → the sheet rises from the foot; a quick flick down on the handle closes it
 *   open on a desktop      → a popover above the button, the search field focused; Escape closes it
 *   docked, on a phone     → the panel fills the lower 55 %; the message bar and the feed's last lines sit right above it
 */
export function Drawer({ open, label, onClose, anchor, focusOnDesk, dock = false, keep = false, children }: DrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // A kept panel is in the page (closed, so not drawn) from the start: opening it costs no render, only the slide.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [place, setPlace] = useState<React.CSSProperties>({});
  const drag = useRef<{ y: number; at: number; lastY: number; lastAt: number; dy: number } | null>(null);
  // Decided at each opening: a phone docks the message bar's panel; a desktop never does.
  const [docked, setDocked] = useState(false);
  const latestClose = useRef(onClose);
  latestClose.current = onClose;

  if (open && !mounted) setMounted(true);

  // A kept panel renders its content once the page is idle, before anyone opens it.
  useEffect(() => {
    if (!keep) return;
    const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 1500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => setMounted(true));
    return () => cancel(id);
  }, [keep]);

  // Once its content is in the page, a kept panel is laid out once, unseen, at the next idle moment, so the
  // first opening does not pay for laying out ~1,900 emoji in the frame the slide starts.
  const warmed = useRef(false);
  useEffect(() => {
    const node = dialog.current;
    if (!keep || !mounted || warmed.current || !node) return;
    const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => {
      if (warmed.current || node.open) return;
      warmed.current = true;
      node.classList.add("warming");
      node.show();
      panel.current?.getBoundingClientRect();
      node.close();
      node.classList.remove("warming");
    });
    return () => cancel(id);
  }, [keep, mounted]);

  // Open: show the dialog, then on a later frame let the panel move in, so the slide is the only work in its frames.
  useLayoutEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    const desk = window.matchMedia(DESK).matches;
    const docking = dock && !desk;
    setDocked(docking);
    setPlace(placeBeside(anchor?.current ?? null));
    let frame = 0;
    let wait = 0;
    const slide = () => {
      if (!node.open) {
        if (docking) node.show();
        else node.showModal();
      }
      if (docking) makeRoom(anchor?.current ?? null);
      const target = desk && focusOnDesk ? node.querySelector<HTMLElement>(focusOnDesk) : null;
      // A docked panel takes no focus: on closing, a dialog hands focus back, and that would raise the keyboard.
      if (!docking) (target ?? panel.current)?.focus({ preventScroll: true });
      frame = requestAnimationFrame(() => (frame = requestAnimationFrame(() => setShown(true))));
    };
    if (docking && keyboardUp()) {
      // Keyboard down first, then the panel up, so the two never move the page at once (Discord does the same swap).
      (document.activeElement as HTMLElement).blur();
      wait = afterKeyboard(slide);
    } else {
      if (docking && document.activeElement instanceof HTMLElement) document.activeElement.blur();
      slide();
    }
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(wait);
    };
  }, [open, anchor, focusOnDesk, dock]);

  // A docked panel hands no focus back to the field when it closes (that would raise the keyboard); the keyboard button does that.
  useEffect(() => {
    if (open || !docked) return;
    if (panel.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
  }, [open, docked]);
  useEffect(() => giveRoomBack, []);

  // On a phone, an open keyboard (the panel's own search) shrinks only the visible part of the page: lift the panel above it.
  useEffect(() => {
    const view = window.visualViewport;
    const node = panel.current;
    if (!open || !view || !node || window.matchMedia(DESK).matches) return;
    const fit = () => {
      const covered = Math.max(0, window.innerHeight - (view.offsetTop + view.height));
      node.style.setProperty("--kb", `${Math.round(covered)}px`);
      node.style.setProperty("--seen", `${Math.round(view.height)}px`);
    };
    fit();
    view.addEventListener("resize", fit);
    view.addEventListener("scroll", fit);
    return () => {
      view.removeEventListener("resize", fit);
      view.removeEventListener("scroll", fit);
      node.style.removeProperty("--kb");
      node.style.removeProperty("--seen");
    };
  }, [open]);

  // A docked panel is not modal: Escape and a tap outside it (but not on its own button, which toggles it) close it.
  useEffect(() => {
    if (!open || !docked) return;
    const away = (event: Event) => {
      if (event.type === "keydown") {
        if ((event as KeyboardEvent).key === "Escape") latestClose.current();
        return;
      }
      const target = event.target as Node;
      if (panel.current?.contains(target) || anchor?.current?.contains(target)) return;
      latestClose.current();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", away);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", away);
    };
  }, [open, docked, anchor]);

  // Close: let the panel move out, then close the dialog, give a docked panel's room back, and (unless kept) drop the content.
  useEffect(() => {
    if (open || !mounted) return;
    setShown(false);
    const done = window.setTimeout(() => {
      dialog.current?.close();
      if (panel.current) panel.current.style.transform = "";
      giveRoomBack();
      if (!keep) setMounted(false);
    }, SETTLE_MS);
    return () => window.clearTimeout(done);
  }, [open, mounted, keep]);

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
  // Under <body>, so a docked (non-modal) panel stacks over the whole page, not inside the card's layer.
  return createPortal(
    <dialog
      ref={dialog}
      className={`drawer${docked ? " dock" : ""}${shown ? " shown" : ""}`}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (!docked && event.target === dialog.current) onClose();
      }}
    >
      <div ref={panel} className="drawer-panel" style={place} tabIndex={-1}>
        <div className="drawer-grab" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <span aria-hidden="true" />
        </div>
        {children}
      </div>
    </dialog>,
    document.body,
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

/**
 * Makes room for a docked panel: sets its height from the visible screen
 * (visualViewport, so Safari's toolbars count), pads the page's foot by
 * that much so the page can move up, and scrolls so the bar holding the
 * button sits just above the panel's top edge.
 * Inputs: the button that opened the panel. Output: nothing; sets --dock-h on <html>.
 * Examples (checked at 375 x 812): the message bar's emoji button → the panel is 447 px tall; the bar's foot sits 8 px above it
 */
function makeRoom(button: HTMLElement | null) {
  const view = window.visualViewport;
  // The visible height without a keyboard (Safari's toolbars count; a keyboard still closing does not).
  const seen = Math.max(view?.height ?? 0, window.innerHeight);
  const height = Math.max(DOCK_MIN, Math.round(seen * DOCK_SHARE));
  const root = document.documentElement;
  root.style.setProperty("--dock-h", `${height}px`);
  root.classList.add("dock-open");
  const bar = button?.closest("form") ?? button;
  if (!bar) return;
  const foot = bar.getBoundingClientRect().bottom - (view?.offsetTop ?? 0);
  const want = seen - height - DOCK_GAP;
  // One instant move, before the panel slides, so nothing reflows while it moves (the bar stays where the keyboard left it).
  window.scrollBy({ top: foot - want, behavior: "instant" as ScrollBehavior });
}

/** Takes the docked panel's room away again. */
function giveRoomBack() {
  document.documentElement.classList.remove("dock-open");
}

/** True when an on-screen keyboard is up: a text field has focus and the visible part of the page has shrunk. */
function keyboardUp(): boolean {
  const view = window.visualViewport;
  const field = document.activeElement;
  const typing = field instanceof HTMLTextAreaElement || (field instanceof HTMLInputElement && field.type !== "button");
  return typing && !!view && view.height < window.innerHeight * 0.85;
}

/**
 * Runs next once the keyboard has gone: when the visible part of the page
 * stops growing, or after 400 ms at most.
 * Inputs: what to run. Output: a timer id, to cancel.
 * Examples (checked in emulation only; a real keyboard needs an iPhone): no keyboard → runs at once on the next resize or after 400 ms
 */
function afterKeyboard(next: () => void): number {
  const view = window.visualViewport;
  let ran = false;
  const go = () => {
    if (ran) return;
    ran = true;
    view?.removeEventListener("resize", settle);
    window.clearTimeout(cap);
    next();
  };
  let calm = 0;
  const settle = () => {
    window.clearTimeout(calm);
    calm = window.setTimeout(go, 60);
  };
  view?.addEventListener("resize", settle);
  const cap = window.setTimeout(go, 400);
  return cap;
}
