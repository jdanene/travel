import { get, goOffline, ref } from "firebase/database";
import { database, signIn } from "./lib/firebase";
import * as paths from "./lib/paths";
import { saveSnapshot } from "./lib/snapshot";
import type { Trip } from "./types/trip";

/**
 * The splash's second entry (vite.config.ts builds it beside the app and
 * shares the Firebase chunk with it). public/assets/hype.js imports it while
 * the splash plays, after setting window.travelPrewarmTrip to the trip id.
 * It signs this device in anonymously, the same sign-in the app restores on
 * the next page, reads the whole trip once, saves it for the app's first
 * paint (lib/snapshot.ts) and closes the connection. tripSecrets is not
 * read: the app reads it only when a sheet asks for it.
 *
 * Inputs: window.travelPrewarmTrip — the trip id hype.js checked.
 * Output: nothing; travel.snapshot.<id> in this tab's sessionStorage. Any
 * failure is silent, and the app then loads the trip as before.
 * Examples (checked on the emulator): the splash with ?t=<id> → about a
 * second after the read starts, travel.snapshot.<id> holds the trip and the uid.
 */
async function prewarm(tripId: unknown): Promise<void> {
  if (typeof tripId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(tripId)) return;
  try {
    const signedIn = await signIn();
    if (!signedIn.ok) return;
    const snapshot = await get(ref(database, paths.trip(tripId)));
    if (snapshot.exists()) saveSnapshot(tripId, signedIn.uid, snapshot.val() as Trip);
  } catch {
    // The app reads the trip itself.
  } finally {
    goOffline(database);
  }
}

void prewarm((window as Window & { travelPrewarmTrip?: unknown }).travelPrewarmTrip);
