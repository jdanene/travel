import { idToken } from "../../../lib/firebase";
import type { MemberId } from "../../../types/trip";
import type { Audience } from "../lib/texts";

/** The sender (services/travel-texts). A public endpoint; it holds no secret and checks the caller's token. */
const TEXTS_URL: string | undefined = import.meta.env.VITE_TEXTS_URL;

/** The sender gives itself 90 seconds for 30 texts; the page waits a little longer. */
const TIMEOUT_MS = 100_000;

/** What happened to one text: sent, refused by AWS (nothing spent), or unknown (it may have gone). */
export interface TextResult {
  memberId: MemberId;
  status: "sent" | "refused" | "unconfirmed";
  reason?: string;
}

export type SendOutcome =
  | { ok: true; results: TextResult[]; textsToday: number }
  /** The sender said no before sending anything: its reason ("daily_cap", "not_organizer", …). */
  | { ok: false; kind: "refused"; reason: string }
  /** No answer: the texts may or may not have gone. */
  | { ok: false; kind: "unknown"; reason: string }
  /** The call never left: nothing was sent. */
  | { ok: false; kind: "notSent"; reason: string };

/**
 * Asks the sender to text the crew. It sends the organizer's ID token, the
 * message and who gets it, never a phone number: the sender reads the
 * numbers itself. A send is paid, so nothing here retries; the sheet
 * offers "Send again to failed" by hand.
 *
 * Inputs: the trip, the message, the audience, and optionally the member
 * ids to text (the failed ones, for "Send again to failed").
 * Output: each recipient's result and the trip's texts so far today, or
 * why nothing was sent, or "unknown" when no answer came back in 100 s.
 * Examples (checked against the deployed sender):
 *   an organizer, "all", two numbers saved → { ok: true, results: [{ memberId: "lc", status: "sent" }, …], textsToday: 1 }
 *   a sixth text the same day              → { ok: false, kind: "refused", reason: "daily_cap" }
 */
export async function textCrew(tripId: string, message: string, audience: Audience, memberIds?: MemberId[]): Promise<SendOutcome> {
  if (!TEXTS_URL) return { ok: false, kind: "notSent", reason: "not_set_up" };
  const token = await idToken().catch(() => null);
  if (!token) return { ok: false, kind: "notSent", reason: "signed_out" };
  let response: Response;
  try {
    response = await fetch(TEXTS_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ tripId, message, audience, memberIds }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Offline, the request never left. Any other failure (a timeout, a dropped answer) may come after the texts went.
    return navigator.onLine ? { ok: false, kind: "unknown", reason: "no_answer" } : { ok: false, kind: "notSent", reason: "no_connection" };
  }
  const answer = (await response.json().catch(() => null)) as
    | { ok?: boolean; sent?: boolean; reason?: string; results?: TextResult[]; textsToday?: number }
    | null;
  if (answer?.ok === true && Array.isArray(answer.results)) {
    return { ok: true, results: answer.results, textsToday: answer.textsToday ?? 0 };
  }
  // The sender marks every refusal made before the first text with sent: false.
  if (answer?.ok === false && answer.sent === false && typeof answer.reason === "string") return { ok: false, kind: "refused", reason: answer.reason };
  // Lambda's own throttle answers 429 before the sender runs: nothing was sent.
  if (response.status === 429 && answer?.ok === undefined) return { ok: false, kind: "notSent", reason: "busy" };
  return { ok: false, kind: "unknown", reason: answer?.reason ?? `status ${response.status}` };
}
