import type { Pin } from "../../../types/pin";

/**
 * The open card under the map (20/10): the pin's name and its line. A tap
 * opens what the pin stands for: the venue's shows, or the stay card.
 *
 * Inputs: the pin, and what a tap does.
 * Output: one button-card.
 * Examples (checked at 390 px against 20/10):
 *   Savaya → "Savaya" / "Club on the cliffs · next show Sat 13 Feb"
 */
export function PinCard({ pin, onOpen }: { pin: Pin; onOpen: (pin: Pin) => void }) {
  return (
    <button type="button" className="pin-card" onClick={() => onOpen(pin)}>
      <span className="h2" style={{ display: "block" }}>
        {pin.name}
      </span>
      {pin.line && <span className="sub">{pin.line}</span>}
    </button>
  );
}
