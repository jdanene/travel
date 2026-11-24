import type { Pin } from "../../../types/pin";

/**
 * The open card under the map (20/10): the pin's name and its line. A tap
 * on a stay or venue card opens what the pin stands for: the stay card or
 * the venue's shows. A friend's place has nothing to open, so its card is
 * not a button: it holds the place's link and, for the friend who added it
 * or an organizer, "Remove".
 *
 * Inputs: the pin, what a tap does, and the remove action when allowed.
 * Output: one card.
 * Examples (checked at 375 px against 20/10):
 *   Savaya       → "Savaya" / "Club on the cliffs · next show Sat 13 Feb", a tap opens Parties
 *   "Sunset bar" → "Sunset bar" / "Food · added by KA", "Open link", "Remove" for KA
 */
export function PinCard({ pin, onOpen, onRemove }: { pin: Pin; onOpen: (pin: Pin) => void; onRemove?: () => void }) {
  if (pin.kind === "place") {
    return (
      <article className="pin-card" aria-label={pin.name}>
        <span className="h2" style={{ display: "block" }}>
          {pin.name}
        </span>
        <span className="sub">{pin.line}</span>
        {(pin.link || onRemove) && (
          <span className="pin-acts">
            {pin.link && (
              <a href={pin.link} target="_blank" rel="noopener noreferrer">
                Open link
              </a>
            )}
            {onRemove && (
              <button type="button" className="remove" onClick={onRemove} aria-label={`Remove ${pin.name}`}>
                Remove
              </button>
            )}
          </span>
        )}
      </article>
    );
  }
  return (
    <button type="button" className="pin-card" onClick={() => onOpen(pin)}>
      <span className="h2" style={{ display: "block" }}>
        {pin.name}
      </span>
      {pin.line && <span className="sub">{pin.line}</span>}
    </button>
  );
}
