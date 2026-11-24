import { write, type WriteResult } from "../../../lib/db";
import * as paths from "../../../lib/paths";
import type { LinkItem } from "../../../types/trip";

/**
 * Saves a link. The rules refuse a second write to the same id, so when
 * two friends save one link at once there is one card and the first keeps
 * "added by" (case 45).
 * Inputs: the trip, the link id (linkId()), and the item.
 * Output: the write result; "refused" here means the link is already there.
 * Examples (checked on the emulator): RB saves a TikTok for Bali → a card "added by RB" on every phone
 */
export function addLink(tripId: string, id: string, item: LinkItem): Promise<WriteResult> {
  return write({ [paths.link(tripId, id)]: item });
}

/**
 * Removes a link for everyone. The friend who added it may, and so may an
 * organizer (case 48).
 * Inputs: the trip and the link id.
 * Output: the write result.
 * Examples (checked on the emulator): "Remove" on your own card → it goes on every phone
 */
export function removeLink(tripId: string, id: string): Promise<WriteResult> {
  return write({ [paths.link(tripId, id)]: null });
}
