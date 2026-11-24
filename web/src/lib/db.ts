import { get, ref, runTransaction, update } from "firebase/database";
import { database } from "./firebase";

/** Why a write did not land: the rules said no, or something else broke. */
export type WriteFailure = "refused" | "failed";

export type WriteResult = { ok: true } | { ok: false; reason: WriteFailure };

/**
 * The one write helper. Every write in the app goes through here, as one
 * multi-path update, so related changes land together or not at all (a
 * removed show takes its "in" marks with it). No feature calls the SDK.
 *
 * With no connection the write waits in the SDK's queue and the promise
 * stays open until the connection is back; the caller shows the change at
 * once and marks it as sending. A refused write never retries.
 *
 * Inputs: changes — database paths (from paths.ts) mapped to their new
 * values; null removes a path.
 * Output: { ok: true } once the server accepts the write, or
 * { ok: false, reason: "refused" } when the rules refuse it, or
 * { ok: false, reason: "failed" } for anything else.
 * Examples (checked on the emulator, not in a test):
 *   write({ [paths.answer(t, "o1", "rb")]: "yes" }) by rb's device    → { ok: true }
 *   write({ [paths.answer(t, "o1", "jd")]: "yes" }) by rb's device    → { ok: false, reason: "refused" }
 */
export async function write(changes: Record<string, unknown>): Promise<WriteResult> {
  try {
    await update(ref(database), changes);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: failure(error) };
  }
}

/**
 * Writes a value only where nothing is yet, in a transaction, so two
 * organizers who confirm at once cannot both win (cases 11 and 20). The
 * SDK retries against fresh data by itself; nothing else retries.
 *
 * Inputs: path — from paths.ts; value — what to write there.
 * Output: { ok: true, won: true } when this write landed;
 * { ok: true, won: false } when another device got there first (the page
 * then shows that result); or a failure, as for write().
 * Examples (checked on the emulator):
 *   confirm with nothing confirmed  → { ok: true, won: true }
 *   confirm after another organizer → { ok: true, won: false }
 */
export async function writeOnce(path: string, value: unknown): Promise<WriteResult & { won?: boolean }> {
  return writeIf<unknown>(path, (current) => (current === null ? value : undefined));
}

/**
 * Writes what next() makes of the stored value, in a transaction, so of two
 * devices that read the same value only one writes; the other's next()
 * runs again on the winner's value. This is how one device claims a job
 * that all of them could start (the events check).
 *
 * Inputs: path — from paths.ts; next — given the stored value (null when
 * there is none), returns the value to write, or undefined to write nothing.
 * It may run more than once, so it must not do anything else.
 * Output: { ok: true, won: true } when this device's value landed;
 * { ok: true, won: false } when next() declined; or a failure, as for write().
 * Examples (checked on the emulator):
 *   claim the check with no lastCheck            → { ok: true, won: true }
 *   claim it again an hour later                 → { ok: true, won: false }
 */
export async function writeIf<T>(path: string, next: (current: T | null) => T | undefined): Promise<WriteResult & { won?: boolean }> {
  try {
    const result = await runTransaction(ref(database, path), (current: T | null) => next(current));
    return { ok: true, won: result.committed };
  } catch (error) {
    return { ok: false, reason: failure(error) };
  }
}

function failure(error: unknown): WriteFailure {
  const text = String((error as { code?: string; message?: string }).code ?? (error as Error).message ?? error);
  return /permission[_ ]denied/i.test(text) ? "refused" : "failed";
}

export type ReadResult<T> = { ok: true; value: T | null } | { ok: false; reason: WriteFailure };

/**
 * Reads one value once, for data the trip listener cannot carry: the
 * tripSecrets branch, which only some devices may read (a member its own
 * phone, an organizer every phone). It does not listen; the caller reads
 * again when its sheet opens. Nothing retries.
 *
 * Inputs: path — from paths.ts.
 * Output: { ok: true, value } (null when nothing is there), or the reason,
 * as for write(): "refused" when the rules say no, "failed" otherwise.
 * Examples (checked on the emulator, not in a test):
 *   read(paths.phone(t, "rb")) by rb's device      → { ok: true, value: { e164: "+14155550123", at: … } }
 *   read(paths.phones(t)) by a friend's device     → { ok: false, reason: "refused" }
 */
export async function read<T>(path: string): Promise<ReadResult<T>> {
  try {
    const snapshot = await get(ref(database, path));
    return { ok: true, value: snapshot.exists() ? (snapshot.val() as T) : null };
  } catch (error) {
    return { ok: false, reason: failure(error) };
  }
}
