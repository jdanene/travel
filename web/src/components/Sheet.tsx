import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
import "./Sheet.css";

interface SheetProps {
  open: boolean;
  title: string;
  /** Called when the friend closes the sheet: the close button, Escape, or a tap outside. */
  onClose: () => void;
  children: ReactNode;
}

/**
 * The bottom sheet of screens 20/5 and 20/8: a title, a close button, and
 * the sheet's one task. Every sheet in the app uses it: the join sheet,
 * Add a place, Add a party and Add a link.
 *
 * It is a native modal dialog, so the browser keeps focus inside it, Escape
 * closes it, and focus returns to the button that opened it. The trip may
 * change under an open sheet; the sheet stays (case 36).
 *
 * Inputs: whether it is open, its title, what closing does, and its content.
 * Output: the sheet over a dimmed page, or nothing while closed.
 * Examples (checked on screen):
 *   open, title "Who are you?" → the sheet slides over the page; Escape closes it
 */
export function Sheet({ open, title, onClose, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onClick={(event) => {
        // A tap on the dimmed page outside the sheet closes it; a tap on the sheet's own padding does not.
        const box = ref.current?.getBoundingClientRect();
        if (event.target === ref.current && box && (event.clientY < box.top || event.clientX < box.left || event.clientX > box.right)) onClose();
      }}
    >
      {open && (
        <>
          <div className="grab" aria-hidden="true" />
          <div className="nav">
            <h2 id="sheet-title" className="h2">
              {title}
            </h2>
            <button type="button" className="ib" aria-label="Close" onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>
          {children}
        </>
      )}
    </dialog>
  );
}
