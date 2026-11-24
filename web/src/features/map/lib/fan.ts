import type { Pin } from "../../../types/pin";

/** The height of one pin label plus a gap, in screen pixels. */
export const FAN_STEP_PX = 34;

/**
 * Spreads pins that share one spot, so every pin can be tapped (case 35).
 * Many venues sit at their area's centre, because they are not on
 * OpenStreetMap, and stays always do. The labels stack in a column centred
 * on the spot, a fixed number of pixels apart, so they stay apart at any
 * zoom; a shift in degrees would vanish when the map shows a whole island.
 *
 * Inputs: pins — any list; spots match to five decimals (about 1 m).
 * Output: the same pins in the same order, each with `shiftPx`, its
 * vertical shift on screen: 0 for a pin alone.
 * Examples (checked on the map):
 *   one pin                → shiftPx 0
 *   three pins on Ban Tai  → shiftPx -34, 0 and 34
 */
export function fanOut(pins: Pin[]): Array<Pin & { shiftPx: number }> {
  const groups = new Map<string, number[]>();
  pins.forEach((pin, index) => {
    const key = `${pin.lat.toFixed(5)},${pin.lng.toFixed(5)}`;
    groups.set(key, [...(groups.get(key) ?? []), index]);
  });
  const spread = pins.map((pin) => ({ ...pin, shiftPx: 0 }));
  for (const members of groups.values()) {
    members.forEach((index, i) => {
      spread[index].shiftPx = (i - (members.length - 1) / 2) * FAN_STEP_PX;
    });
  }
  return spread;
}
