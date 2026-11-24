import type { Trip } from "../types/trip";

/**
 * The trip as the splash read it, so the app's first paint holds real data
 * (owner, 24 Nov 2026: "literally everything on the app loads at the splash
 * screen"). The splash's prewarm script (src/prewarm.ts) saves it in this
 * tab's sessionStorage under this key; the app reads it once as it starts and
 * then follows the live listener as before.
 */
export const snapshotKey = (tripId: string) => `travel.snapshot.${tripId}`;

/** How long a snapshot may stand in for the live trip: long enough to sit on the splash, short enough to stay true. */
const SNAPSHOT_MS = 5 * 60_000;

/** What the splash saves: when it read the trip, which trip, the device's uid, and the trip itself. */
export interface Snapshot {
  at: number;
  tripId: string;
  uid: string;
  trip: Trip;
}

/**
 * Says whether a saved snapshot may draw the first paint of this trip: it is
 * this trip's, it holds a uid and a trip, and it is at most 5 minutes old.
 *
 * Inputs: saved — the text under snapshotKey(tripId), or null when there is
 * none; tripId — the trip in the address; now — the time now, in milliseconds.
 * Output: the snapshot, or null to wait for the live listener as before.
 * Examples (each is a test in snapshot.test.ts):
 *   saved 30 seconds ago for this trip   → the snapshot
 *   saved 6 minutes ago                  → null (stale)
 *   saved for another trip               → null
 *   no snapshot, or text that is not one → null
 */
export function freshSnapshot(saved: string | null, tripId: string, now: number): Snapshot | null {
  if (saved === null) return null;
  let snapshot: Partial<Snapshot>;
  try {
    snapshot = JSON.parse(saved) as Partial<Snapshot>;
  } catch {
    return null;
  }
  if (!snapshot || snapshot.tripId !== tripId || typeof snapshot.uid !== "string" || !snapshot.trip) return null;
  const age = now - Number(snapshot.at);
  return age >= 0 && age <= SNAPSHOT_MS ? (snapshot as Snapshot) : null;
}

/**
 * Reads this trip's snapshot from the tab's sessionStorage, if a fresh one is there.
 * Inputs: tripId. Output: the snapshot, or null; blocked storage counts as none.
 * Examples (checked on the emulator): a tap on the splash's button within 5 minutes of its read → the snapshot
 */
export function readSnapshot(tripId: string): Snapshot | null {
  try {
    return freshSnapshot(window.sessionStorage.getItem(snapshotKey(tripId)), tripId, Date.now());
  } catch {
    return null;
  }
}

/**
 * Saves the trip for the app's first paint. A full or blocked storage saves nothing; the app then loads as before.
 * Inputs: the trip id, the device's uid, the trip. Output: nothing.
 * Examples (checked on the emulator): the splash's prewarm → travel.snapshot.<id> = { at, tripId, uid, trip }
 */
export function saveSnapshot(tripId: string, uid: string, trip: Trip): void {
  const snapshot: Snapshot = { at: Date.now(), tripId, uid, trip };
  try {
    window.sessionStorage.setItem(snapshotKey(tripId), JSON.stringify(snapshot));
  } catch {
    // Nothing saved: the app waits for the live listener.
  }
}
