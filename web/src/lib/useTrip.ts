import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import type { Trip } from "../types/trip";
import { database, signIn, watchUid } from "./firebase";
import * as paths from "./paths";
import { readSnapshot } from "./snapshot";

/** How long the page waits, with no connection, before it says so. */
const OFFLINE_AFTER_MS = 5000;

/** A trip id that fits a database path; anything else cannot be a trip. */
const TRIP_ID = /^[A-Za-z0-9_-]{1,64}$/;

export type TripState =
  | { status: "loading" }
  | { status: "offline" }
  | { status: "notFound" }
  | { status: "failed"; reason: string; retry: () => void }
  | { status: "ready"; trip: Trip; uid: string; offline: boolean };

/**
 * The one listener on the trip. It signs the device in, then follows the
 * whole trip; every feature reads its own part of what this returns
 * (plan, D7). A second listener anywhere is a finding.
 *
 * Inputs: tripId — the id from the address bar.
 * Output, one of:
 *   loading   — signing in, or waiting for the first answer.
 *   offline   — no first answer and no connection for 5 seconds; the SDK
 *               keeps trying, and the state moves on by itself (case 2).
 *   notFound  — the id is not a trip, or cannot be one (case 1). No retry.
 *   failed    — sign-in failed three times, or the read was refused; the
 *               reason is the SDK's code, and retry() starts again (case 3).
 *   ready     — the trip, this device's uid, and whether the connection is
 *               gone right now. The trip updates live under the page, and
 *               the uid follows a Google sign-in that changes it. With a
 *               fresh snapshot from the splash (lib/snapshot.ts) the first
 *               state is already ready, drawn from it, and the listener
 *               takes over when its first answer comes.
 * Examples (checked on the emulator, not in a test):
 *   a good link                → ready
 *   the splash's button        → ready on the first paint, from the snapshot
 *   /trip/wrong                → notFound
 *   emulator stopped, 5 s      → offline
 */
export function useTrip(tripId: string): TripState {
  const [state, setState] = useState<TripState>(() => {
    const snapshot = TRIP_ID.test(tripId) ? readSnapshot(tripId) : null;
    return snapshot ? { status: "ready", trip: snapshot.trip, uid: snapshot.uid, offline: false } : { status: "loading" };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!TRIP_ID.test(tripId)) {
      setState({ status: "notFound" });
      return;
    }
    // A page drawn from the splash's snapshot stays drawn while the listener connects.
    setState((current) => (current.status === "ready" ? current : { status: "loading" }));

    let stopped = false;
    let connected = false;
    let offlineTimer: ReturnType<typeof setTimeout> | undefined;
    const stops: Array<() => void> = [];
    const retry = () => setAttempt((n) => n + 1);

    const setOffline = (offline: boolean) =>
      setState((current) => {
        if (current.status === "ready") return current.offline === offline ? current : { ...current, offline };
        if (current.status === "loading" && offline) return { status: "offline" };
        if (current.status === "offline" && !offline) return { status: "loading" };
        return current;
      });

    const watchConnection = (isConnected: boolean) => {
      connected = isConnected;
      clearTimeout(offlineTimer);
      if (connected) setOffline(false);
      else offlineTimer = setTimeout(() => !connected && setOffline(true), OFFLINE_AFTER_MS);
    };
    stops.push(onValue(ref(database, ".info/connected"), (snapshot) => watchConnection(snapshot.val() === true)));

    void signIn().then((result) => {
      if (stopped) return;
      if (!result.ok) {
        setState({ status: "failed", reason: result.reason, retry });
        return;
      }
      // The organizer's second phone signs in as the first phone's uid (D15); the page follows.
      let uid = result.uid;
      stops.push(
        watchUid((next) => {
          uid = next;
          setState((current) => (current.status === "ready" && current.uid !== next ? { ...current, uid: next } : current));
        }),
      );
      stops.push(
        onValue(
          ref(database, paths.trip(tripId)),
          (snapshot) =>
            setState(
              snapshot.exists()
                ? { status: "ready", trip: snapshot.val() as Trip, uid, offline: !connected }
                : { status: "notFound" },
            ),
          (error) => setState({ status: "failed", reason: (error as { code?: string }).code ?? error.message, retry }),
        ),
      );
    });

    return () => {
      stopped = true;
      clearTimeout(offlineTimer);
      stops.forEach((stop) => stop());
    };
  }, [tripId, attempt]);

  return state;
}
