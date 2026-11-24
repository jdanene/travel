import { activityLine, forgetLines } from "../../../lib/activity";
import { write, type WriteResult } from "../../../lib/db";
import * as paths from "../../../lib/paths";
import type { CustomPlace } from "../../../types/trip";

/**
 * Puts a friend's place on the map for everyone, with its Activity line in
 * the same write. Each place gets its own
 * id, so two friends who add the same name at once get two pins.
 * Inputs: the trip, a new place id (newPlaceId() in lib/ids.ts), and the place.
 * Output: the write result; "refused" when the device has no member.
 * Examples (checked on the emulator): KA adds "Sunset bar", Food, in Canggu → a pin on every phone
 */
export function addPlace(tripId: string, id: string, place: CustomPlace): Promise<WriteResult> {
  const line = activityLine(tripId, { kind: "place-added", by: place.addedBy, text: place.name, ref: id });
  return write({ [paths.customPlace(tripId, id)]: place, ...line });
}

/**
 * Takes a friend's place off the map for everyone. The friend who added it
 * may, and so may an organizer.
 * Inputs: the trip and the place id.
 * Output: the write result.
 * Examples (checked on the emulator): "Remove" on your own place → its pin goes on every phone
 */
export async function removePlace(tripId: string, id: string): Promise<WriteResult> {
  const result = await write({ [paths.customPlace(tripId, id)]: null });
  if (result.ok) void forgetLines(tripId, id, ["place-added"]);
  return result;
}

