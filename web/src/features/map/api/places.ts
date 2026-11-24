import { write, type WriteResult } from "../../../lib/db";
import * as paths from "../../../lib/paths";
import type { CustomPlace } from "../../../types/trip";

/**
 * Puts a friend's place on the map for everyone. Each place gets its own
 * id, so two friends who add the same name at once get two pins.
 * Inputs: the trip, a new place id (newPlaceId() in lib/ids.ts), and the place.
 * Output: the write result; "refused" when the device has no member.
 * Examples (checked on the emulator): KA adds "Sunset bar", Food, in Canggu → a pin on every phone
 */
export function addPlace(tripId: string, id: string, place: CustomPlace): Promise<WriteResult> {
  return write({ [paths.customPlace(tripId, id)]: place });
}

/**
 * Takes a friend's place off the map for everyone. The friend who added it
 * may, and so may an organizer.
 * Inputs: the trip and the place id.
 * Output: the write result.
 * Examples (checked on the emulator): "Remove" on your own place → its pin goes on every phone
 */
export function removePlace(tripId: string, id: string): Promise<WriteResult> {
  return write({ [paths.customPlace(tripId, id)]: null });
}

