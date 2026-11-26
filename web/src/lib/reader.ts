/**
 * The app's side of the link reader (services/link-reader): one call that
 * reads a pasted link, which Stay and Links both use, one that asks where a
 * short link points (the Feed's video players), one that reads an Instagram
 * post's account and caption (the Feed's Instagram card), and one that asks
 * it to check the clubs' pages for events.
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

/** The Feed's reader calls: three tries at most, after 0 s, 1 s and 3 s, each waiting 7 s (the reader itself waits 6 s for the site). */
const RESOLVE_WAITS_MS = [0, 1000, 3000];
const RESOLVE_TIMEOUT_MS = 7000;

/**
 * Asks the reader where an Instagram or TikTok short or share link points,
 * for the Feed's video players, through the Feed's line (askFeedReader).
 *
 * Inputs: url — a short link the caller has already recognised.
 * Output: the address it points to, or null when the reader says no, fails
 * three times, or is not set up.
 * Examples (checked against a local run of the reader, 25 Nov 2026):
 *   https://vt.tiktok.com/ZS9bVfWa6/ → "https://www.tiktok.com/@/video/7620909821147073813?_r=1&…"
 *   reader not set up (a dev build) → null at once
 */
export async function resolveLink(url: string): Promise<string | null> {
  const answer = await askFeedReader(`resolve=${encodeURIComponent(url)}`);
  return answer?.ok && typeof answer.url === "string" ? answer.url : null;
}

/** The Feed's calls wait in one line, at most two at a time: the reader takes two calls at once and refuses the rest. */
const FEED_AT_ONCE = 2;
let feedCalls = 0;
const feedLine: Array<() => void> = [];

/**
 * Asks the reader one of the Feed's questions (?resolve or ?card). The
 * calls wait in a line, two at a time, because the reader serves only two
 * at once and refuses the rest. A refusal for being busy (429), a server
 * error, a lost call or a timeout is tried again, three tries in all, after
 * 1 s and then 3 s; any other answer is final.
 *
 * Inputs: query — the query string after "?", already encoded.
 * Output: the reader's answer, or null when it is not set up or every try failed.
 * Examples (checked against a local run of the reader, 26 Nov 2026):
 *   four Instagram posts drawn at once → the four answers, two calls at a time
 *   the reader busy on the first try → the answer from the second
 */
async function askFeedReader(query: string): Promise<({ ok: boolean; reason?: string } & Record<string, unknown>) | null> {
  if (!READER_URL) return null;
  if (feedCalls >= FEED_AT_ONCE) await new Promise<void>((go) => feedLine.push(go));
  feedCalls++;
  try {
    for (const wait of RESOLVE_WAITS_MS) {
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      try {
        const response = await fetch(`${READER_URL}?${query}`, { signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS) });
        if (response.status === 429 || response.status >= 500) continue;
        const answer = (await response.json()) as { ok: boolean; reason?: string } & Record<string, unknown>;
        if (answer.ok || answer.reason !== "timeout") return answer;
      } catch {
        // A lost call or our own timeout: try again.
      }
    }
    return null;
  } finally {
    feedCalls--;
    feedLine.shift()?.();
  }
}

/** What Instagram's own chat shows around a shared post: the account, its picture and the caption's start. */
export interface PostCard {
  /** The account that posted, as Instagram writes it ("keinemusik"). */
  name: string;
  /** True when Instagram marks the account as verified. */
  verified?: true;
  /** The first account it posted with, when there is one, and its picture. */
  also?: string;
  alsoAvatarUrl?: string;
  kind: "video" | "album" | "image";
  avatarUrl?: string;
  caption?: string;
}

/**
 * Asks the reader for an Instagram post's account, account picture and
 * caption, for the Feed's Instagram card (design exception 42), through the
 * Feed's line (askFeedReader).
 *
 * Inputs: url — a post's or reel's address the caller has already recognised.
 * Output: the card, or null when the reader says no (a private or removed
 * post), fails three times, or is not set up; the Feed then shows the post
 * without its account and caption.
 * Examples (checked against a local run of the reader, 26 Nov 2026):
 *   a photo post → { name: "keinemusik", also: "adamport", kind: "image", avatarUrl: "https://scontent-…", caption: "first keinemusik show of 2027 …" }
 *   a profile's address → null at once (not_allowed)
 */
export async function readCard(url: string): Promise<PostCard | null> {
  const answer = await askFeedReader(`card=${encodeURIComponent(url)}`);
  return answer?.ok ? postCard(answer) : null;
}

/**
 * Checks that a value has a card's shape before the app draws it; the
 * reader's answer and a card kept on the device both pass through it.
 *
 * Inputs: value — anything.
 * Output: the card with only its known fields, or null.
 * Examples (tests in reader.test.ts):
 *   { name: "keinemusik", kind: "image", caption: "first show" } → the same
 *   { name: "x y", kind: "image" } → null (not an account name)
 *   { name: "a", kind: "video", avatarUrl: "http://cdn.example/a.jpg" } → { name: "a", kind: "video" } (the picture must be https)
 *   { name: "a", kind: "image", verified: "yes", alsoAvatarUrl: "https://cdn.example/b.jpg" } → { name: "a", kind: "image" } (no second account, and verified must be true)
 */
export function postCard(value: unknown): PostCard | null {
  const record = value as Record<string, unknown> | null;
  const account = (text: unknown): text is string => typeof text === "string" && /^[A-Za-z0-9._]{1,30}$/.test(text);
  if (!record || !account(record.name) || (record.kind !== "video" && record.kind !== "album" && record.kind !== "image")) return null;
  const card: PostCard = { name: record.name, kind: record.kind };
  const picture = (text: unknown): text is string => typeof text === "string" && /^https:\/\/[^\s"<>]{1,1200}$/.test(text);
  if (record.verified === true) card.verified = true;
  if (account(record.also)) card.also = record.also;
  if (card.also && picture(record.alsoAvatarUrl)) card.alsoAvatarUrl = record.alsoAvatarUrl;
  if (picture(record.avatarUrl)) card.avatarUrl = record.avatarUrl;
  if (typeof record.caption === "string" && record.caption.trim()) card.caption = record.caption.trim().slice(0, 240);
  return card;
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
  /** When the night starts and ends, "HH:MM" on the venue's clock, when the club gives a time. Unchecked here; newShows checks them. */
  startTime?: string;
  endTime?: string;
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
