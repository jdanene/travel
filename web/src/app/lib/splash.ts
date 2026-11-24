/**
 * The splash comes first (owner, 23 Nov 2026: "I should not be able to get
 * to the admin page without going through the splash", and "If I refresh it
 * should go back to the splash"). The splash's "OPEN THE TRIP" button saves
 * a one-time pass, the time of the tap, in this tab's sessionStorage under
 * this key; public/assets/hype.js writes the same key. The app spends the
 * pass on load.
 */
export const splashKey = (tripId: string) => `travel.splash.${tripId}`;

/** How long a pass lasts: long enough for a slow phone to load the app, too short to reuse later. */
const PASS_MS = 60_000;

/**
 * Says whether a pass from the splash lets this load into the app: the tap
 * happened in the last minute. A pass the tab never spent (a tap that opened
 * a new tab, say) is no good later.
 *
 * Inputs: tapped — what the splash saved under splashKey(tripId): the time
 * of the tap in milliseconds, as text; null when there is no pass.
 * now — the time now, in milliseconds.
 * Output: true when the tap is at most a minute old.
 * Examples (each is a test in splash.test.ts):
 *   tapped 2 seconds ago   → true
 *   tapped 2 minutes ago   → false (a stale pass)
 *   no pass                → false
 */
export function passIsFresh(tapped: string | null, now: number): boolean {
  if (tapped === null) return false;
  const age = now - Number(tapped);
  return age >= 0 && age <= PASS_MS;
}

const PROBE = "travel.probe";

/**
 * Decides whether this load of /trip/<tripId> goes to the splash first, and
 * spends the splash's pass. Only a load straight after the splash's button
 * opens the trip; a refresh, a new tab, a typed address or Back from another
 * site goes to "/?t=<tripId>", with the organizer key carried along. Call it
 * once per page load: the pass is gone after the first call.
 *
 * Inputs: tripId — from the address; search — the address's query, such as
 * "?organizer=K…".
 * Output: the splash address to replace this one with, or null to open the
 * trip. A tab whose storage is blocked opens the trip: the splash could not
 * have saved a pass there, so sending it back would trap the friend.
 * Examples (checked on the emulator):
 *   /trip/<id> in a new tab                  → "/?t=<id>"
 *   /trip/<id>?organizer=<key> in a new tab  → "/?t=<id>&organizer=<key>"
 *   /trip/<id> after the splash's button     → null; a refresh then → "/?t=<id>"
 */
export function splashAddress(tripId: string, search: string): string | null {
  let tapped: string | null;
  try {
    // A write, not only a read: some private modes read fine and refuse every write.
    const storage = window.sessionStorage;
    storage.setItem(PROBE, "1");
    storage.removeItem(PROBE);
    tapped = storage.getItem(splashKey(tripId));
    storage.removeItem(splashKey(tripId));
  } catch {
    return null;
  }
  if (passIsFresh(tapped, Date.now())) return null;
  const splash = new URLSearchParams({ t: tripId });
  const key = new URLSearchParams(search).get("organizer");
  if (key) splash.set("organizer", key);
  return `/?${splash}`;
}
