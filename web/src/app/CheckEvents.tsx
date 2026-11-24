import { useCallback, useEffect, useRef, useState } from "react";
import { write, writeIf } from "../lib/db";
import { ago } from "../lib/format";
import * as paths from "../lib/paths";
import { checkClubs } from "../lib/reader";
import type { MemberId, Parties, Trip } from "../types/trip";
import { checkIsDue, newShows } from "./lib/eventCheck";

/** What this device's last check did: "ran" with the shows it added, "skipped" (not due, or another phone has it), or "failed". */
export type CheckResult = { status: "ran"; added: number } | { status: "skipped" } | { status: "failed" };

export interface EventCheck {
  result: CheckResult | null;
  running: boolean;
  /** The organizer's "Check for new events": runs now, whatever the once-a-day rule says. */
  checkNow: () => void;
}

/**
 * Runs the events check once when a friend who has joined opens the trip,
 * and gives the organizer a way to run it now. New events appear in the
 * list for everyone; nothing else on the page changes, and a failure is
 * only logged (console.warn), because the friend did not ask for it.
 *
 * Inputs: tripId; trip — the live trip; memberId — this device's member,
 * or null before the friend joins (then nothing runs).
 * Output: the last result on this device, whether a check is running, and
 * checkNow().
 * Examples (checked on the emulator with the reader run locally):
 *   first open, no lastCheck        → lastCheck { at, by }, then Savaya's acts not yet listed appear as "not confirmed"
 *   a second phone opens a minute later → skipped: its claim finds the first one's lastCheck
 *   the reader is down              → lastCheck is written, nothing is added, one warning in the console
 */
export function useEventCheck(tripId: string, trip: Trip, memberId: MemberId | null): EventCheck {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [running, setRunning] = useState(false);
  const latest = useRef(trip);
  latest.current = trip;
  const started = useRef(false);

  const run = useCallback(
    (force: boolean) => {
      if (!memberId) return;
      setRunning(true);
      void runCheck(tripId, () => latest.current, memberId, force)
        .then(setResult)
        .finally(() => setRunning(false));
    },
    [tripId, memberId],
  );

  useEffect(() => {
    if (!memberId || started.current) return;
    started.current = true;
    run(false);
  }, [memberId, run]);

  return { result, running, checkNow: useCallback(() => run(true), [run]) };
}

/**
 * Claims the check, asks the reader, and writes the new shows. The claim
 * is a transaction on parties/lastCheck, so of two phones that open the
 * trip at once only one asks the reader.
 */
async function runCheck(tripId: string, tripNow: () => Trip, memberId: MemberId, force: boolean): Promise<CheckResult> {
  const now = Date.now();
  type LastCheck = NonNullable<Parties["lastCheck"]>;
  const claim = await writeIf<LastCheck>(paths.lastCheck(tripId), (current) => {
    const lastAt = typeof current?.at === "number" ? current.at : undefined;
    // "Check now" ignores the 24 hours, but lastCheck still only moves forward.
    const due = force ? lastAt === undefined || now > lastAt : checkIsDue(lastAt, now);
    return due ? { at: now, by: memberId } : undefined;
  });
  if (!claim.ok) {
    console.warn(`Events check: the claim on lastCheck was ${claim.reason}.`);
    return { status: "failed" };
  }
  if (!claim.won) return { status: "skipped" };

  const found = await checkClubs();
  if (!found) {
    console.warn("Events check: the link reader did not answer.");
    return { status: "failed" };
  }
  for (const { venue, reason } of found.failed) console.warn(`Events check: could not read ${venue} (${reason}).`);

  const shows = Object.entries(newShows(found.events, tripNow(), now));
  // One write per show, so a show another phone just added (refused) does not hold back the rest.
  const results = await Promise.all(shows.map(([id, show]) => write({ [paths.show(tripId, id)]: show })));
  const refused = results.filter((r) => !r.ok).length;
  if (refused) console.warn(`Events check: ${refused} of ${shows.length} new shows were not saved.`);
  return { status: "ran", added: shows.length - refused };
}

/**
 * The organizer's line at the foot of the Events module: "Check for new
 * events", and what the last check found.
 *
 * Inputs: check — from useEventCheck; lastAt — parties/lastCheck/at.
 * Output: the button and, once a check has run, "Checked 3 h ago", with
 * "· 2 new" or "· nothing new" after a check on this device; "Checking…"
 * while one runs; "Could not check" when this device's check failed.
 * Examples (checked on the emulator at 390 px):
 *   no check yet           → "Check for new events"
 *   after "Check now"      → "Check for new events  Checked just now · 2 new"
 */
export function CheckEventsLine({ check, lastAt }: { check: EventCheck; lastAt: number | undefined }) {
  const { result, running, checkNow } = check;
  let line: string | null = null;
  if (running) line = "Checking…";
  else if (result?.status === "failed") line = "Could not check";
  else if (lastAt !== undefined) {
    const found = result?.status === "ran" ? (result.added ? ` · ${result.added} new` : " · nothing new") : "";
    line = `Checked ${ago(lastAt, Date.now())}${found}`;
  }
  return (
    <div className="check-events">
      <button type="button" className="check-now" onClick={checkNow} disabled={running}>
        Check for new events
      </button>
      <span className="cap" role="status">
        {line}
      </span>
    </div>
  );
}
