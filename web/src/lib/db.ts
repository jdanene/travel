import { ref, update } from "firebase/database";
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
    const text = String((error as { code?: string; message?: string }).code ?? (error as Error).message ?? error);
    return { ok: false, reason: /permission[_ ]denied/i.test(text) ? "refused" : "failed" };
  }
}
