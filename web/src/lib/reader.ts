/**
 * The app's side of the link reader (services/link-reader): one call that
 * reads a pasted link. Stay and Links both use it.
 */

const READER_URL: string | undefined = import.meta.env.VITE_READER_URL;

/** The waits before each try, from the first: 0 s, 1 s, 3 s (plan, case 16). */
const WAITS_MS = [0, 1000, 2000];
const TRY_TIMEOUT_MS = 8000;

export interface ReadLink {
  /** A listing's name. */
  name?: string;
  /** A post's caption. */
  title?: string;
  photoUrl?: string;
  area?: string;
  sleeps?: number;
}

/**
 * Reads a link through the reader. Only a lost call or a timeout is tried
 * again; an answer such as "unreadable" (Booking.com's challenge page) is
 * final at once, so the friend is not kept waiting for a known answer.
 *
 * Inputs: url — an https address the caller has already checked.
 * Output: what the reader found, or null when it found nothing, failed
 * three times, or is not set up; the caller then asks for typed values.
 * Examples (checked against the deployed reader):
 *   an Airbnb room       → { name: "…", area: "…", sleeps: 4, photoUrl: "https://…" }
 *   a Booking.com hotel  → null at once (unreadable)
 */
export async function readLink(url: string): Promise<ReadLink | null> {
  if (!READER_URL) return null;
  for (const wait of WAITS_MS) {
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    try {
      const response = await fetch(`${READER_URL}?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(TRY_TIMEOUT_MS) });
      const answer = (await response.json()) as { ok: boolean; reason?: string } & ReadLink;
      if (answer.ok) return answer;
      if (answer.reason !== "timeout") return null;
    } catch {
      // A lost call or our own timeout: try again.
    }
  }
  return null;
}
