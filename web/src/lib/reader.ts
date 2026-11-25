/**
 * The app's side of the link reader (services/link-reader): one call that
 * reads a pasted link, which Stay and Links both use, and one that asks it
 * to check the clubs' pages for events.
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

/** One event the check found on a club's own page. */
export interface FoundEvent {
  destination: string;
  venue: string;
  area?: string;
  date: string;
  artist: string;
  link: string;
  /** The night's picture, when the club gives one: an https address. */
  image?: string;
}

/** A club the check could not read, and why ("timeout", "unreadable", …). */
export interface FailedSource {
  venue: string;
  reason: string;
}

const CHECK_TIMEOUT_MS = 20_000;

/**
 * Asks the reader to check the clubs' own event pages. One try: the check
 * runs in the background, and the next one is a day away.
 *
 * Output: the events the reader found (at most 100) and the clubs it could
 * not read, or null when the reader is not set up, cannot be reached, takes
 * more than 20 seconds, or answers with something else. An event that is
 * not an object with text fields is dropped here; the caller checks the
 * rest, as the database rules do.
 * Examples (checked against a local run of the reader):
 *   reader up   → { events: [{ destination: "bali", venue: "Savaya", date: "2027-02-13", artist: "PEGGY GOU", … }], failed: [] }
 *   reader down → null
 */
export async function checkClubs(): Promise<{ events: FoundEvent[]; failed: FailedSource[] } | null> {
  if (!READER_URL) return null;
  try {
    const response = await fetch(`${READER_URL}?check=events`, { signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
    const answer = (await response.json()) as { ok?: unknown; events?: unknown; failed?: unknown };
    if (answer.ok !== true || !Array.isArray(answer.events)) return null;
    const text = (value: unknown) => typeof value === "string";
    return {
      events: answer.events
        .filter((e): e is FoundEvent => !!e && ["destination", "venue", "date", "artist", "link"].every((key) => text(e[key])) && (e.area === undefined || text(e.area)))
        .slice(0, 100),
      failed: Array.isArray(answer.failed) ? answer.failed.filter((f): f is FailedSource => !!f && text(f.venue) && text(f.reason)) : [],
    };
  } catch {
    return null;
  }
}
