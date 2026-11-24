import { push, ref } from "firebase/database";
import type { ActivityEntry } from "../types/trip";
import { read, write } from "./db";
import { database } from "./firebase";
import * as paths from "./paths";

/**
 * Makes a new activity id the way push() does: time-ordered and made on
 * this device, with nothing written. Posts, polls and automatic lines all
 * take their ids from here, so the list sorts by id.
 *
 * Inputs: the trip.
 * Output: a fresh id, such as "-OD3x…".
 * Examples (checked on the emulator): two calls a moment apart → two ids, the later one sorting after
 */
export function newActivityId(tripId: string): string {
  return push(ref(database, paths.activity(tripId))).key!;
}

/**
 * The activity line of one action, as a part of that action's write, so the
 * thing and its line land together or not at all. Every feature's api file
 * spreads it into its own write() call; no feature writes a line alone.
 *
 * Inputs: the trip; the line without its time (kind, by, and text, ref or
 * options when the kind has them); fields left undefined are dropped.
 * Output: { "trips/{tripId}/activity/{newId}": line with at = now }.
 * Examples (checked on the emulator):
 *   activityLine(t, { kind: "stay-added", by: "ka", text: "Cliffside villa", ref: "s1" })
 *     → { "trips/t/activity/-OD3x…": { kind: "stay-added", by: "ka", text: "Cliffside villa", ref: "s1", at: 1764… } }
 *   activityLine(t, { kind: "joined", by: "rj", text: undefined }) → the line with no text field
 */
export function activityLine(tripId: string, line: Omit<ActivityEntry, "at">): Record<string, ActivityEntry> {
  const entry = Object.fromEntries(Object.entries(line).filter(([, value]) => value !== undefined)) as Omit<ActivityEntry, "at">;
  return { [paths.activityEntry(tripId, newActivityId(tripId))]: { ...entry, at: Date.now() } };
}

/**
 * Takes the automatic lines about one thing off the Feed, after the thing
 * itself was removed (owner, 24 Nov 2026: "if I add a link then delete,
 * remove the record that says I added a link"). Each line goes in its own
 * write with its emoji, so a line this device may not delete (another
 * friend's, for a non-organizer) is left and never blocks the rest. One
 * try, no retry: a line that stays is harmless.
 *
 * Inputs: the trip; the thing's id (the line's ref); the kinds to remove;
 * and, when only one member's lines should go, that member.
 * Output: nothing; resolves when the writes have been tried.
 * Examples (checked on the emulator):
 *   forgetLines(t, linkId, ["link-added"])       → "Dom added a link: Instagram" goes
 *   forgetLines(t, showId, ["event-in"], "rb")   → RB's "is in for" line of that show goes; KA's stays
 */
export async function forgetLines(tripId: string, ref: string, kinds: ActivityEntry["kind"][], by?: string): Promise<void> {
  const all = await read<Record<string, ActivityEntry>>(paths.activity(tripId));
  if (!all.ok || !all.value) return;
  const ids = Object.entries(all.value)
    .filter(([, line]) => line.ref === ref && kinds.includes(line.kind) && (by === undefined || line.by === by))
    .map(([id]) => id);
  await Promise.all(ids.map((id) => write({ [paths.activityEntry(tripId, id)]: null, [paths.activityReactions(tripId, id)]: null })));
}
