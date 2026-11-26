import { usableEmote, type Emote } from "./reactions";

/**
 * Emotes beyond Unicode (Pepe and friends) from 7TV, the public emote
 * library: no key, and its API answers browsers directly (checked 24 Nov
 * 2026: 7tv.io sends Access-Control-Allow-Origin for any page; BetterTTV's
 * search and trending answer 403, so it is not used). Discord's own emotes
 * are uploaded per server and have no public library.
 *
 * Each call waits at most 15 s and never retries by itself; the screen
 * offers "Try again". Answers are kept for the page's life, so reopening
 * the grid costs no call. The most used emotes (the grid's "Emotes" row)
 * are asked for during the warm-up (warmEmotes) and kept on the device
 * for a day. No call carries a referrer, so 7TV never sees the trip's
 * address; nothing about the trip or the person is sent.
 */

const API = "https://7tv.io/v3/gql";
// A word 7TV has not been asked lately can take several seconds on its side; still bounded.
const WAIT_MS = 15000;
const QUERY = `query Emotes($q: String!, $limit: Int!) {
  emotes(query: $q, limit: $limit, page: 1, sort: { value: "popularity", order: DESCENDING },
    filter: { exact_match: false, ignore_tags: false, zero_width: false, animated: false }) { items { id name } }
}`;

const kept = new Map<string, Promise<Emote[]>>();
/** The "Emotes" row's answer on this device, and how long it stays good. */
const SAVED = "travel.feed.emotes";
const SAVED_MS = 24 * 60 * 60 * 1000;
/** The warm-up's call: a short wait, and two tries at most. */
const WARM_WAIT_MS = 6000;
const WARM_TRIES = 2;

/**
 * 7TV's emotes matching some words, most used first; "" gives the most
 * used of all (the grid's "Emotes" row before any search), read from this
 * device when it was asked less than a day ago.
 * Inputs: the words; how many at most; how long to wait (15 s unless the
 * warm-up says less). Output: the emotes this app can store (see
 * usableEmote); a failure rejects and is forgotten, so "Try again" asks
 * once more.
 * Examples (checked against 7tv.io on 24 Nov 2026):
 *   ""     → GIGACHAD, catJAM, COPIUM, Prayge, …
 *   "pepe" → emotes named or tagged pepe
 */
export function findEmotes(words: string, limit = 60, waitMs = WAIT_MS): Promise<Emote[]> {
  const q = words.trim();
  const id = `${q}|${limit}`;
  const old = kept.get(id);
  if (old) return old;
  const saved = q === "" ? readSaved(limit) : null;
  if (saved) {
    const ready = Promise.resolve(saved);
    kept.set(id, ready);
    return ready;
  }
  const asked = fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { q, limit } }),
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(waitMs),
  })
    .then(async (answer) => {
      if (!answer.ok) throw new Error(`7TV answered ${answer.status}`);
      const body = (await answer.json()) as { data?: { emotes?: { items?: Emote[] } } };
      const emotes = (body.data?.emotes?.items ?? []).map(({ id: emoteId, name }) => ({ id: emoteId, name })).filter(usableEmote);
      if (q === "") save(limit, emotes);
      return emotes;
    })
    .catch((error: unknown) => {
      kept.delete(id);
      throw error;
    });
  kept.set(id, asked);
  return asked;
}

/**
 * The "Emotes" row's answer kept on this device, while it is under a day old.
 * Inputs: how many the row asks for. Output: the emotes, or null (none kept,
 * too old, another size, unreadable, or storage refused).
 * Examples (checked in Chrome): asked an hour ago → the same 60 emotes, with no call
 */
function readSaved(limit: number): Emote[] | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(SAVED) ?? "null");
    if (!saved || typeof saved !== "object") return null;
    const { at, size, items } = saved as { at?: unknown; size?: unknown; items?: unknown };
    if (typeof at !== "number" || Date.now() - at > SAVED_MS || at > Date.now() || size !== limit || !Array.isArray(items)) return null;
    return items.filter((item): item is Emote => !!item && typeof item.id === "string" && typeof item.name === "string" && usableEmote(item));
  } catch {
    return null;
  }
}

/**
 * Keeps the "Emotes" row's answer on this device for a day.
 * Inputs: the row's size; the emotes. Output: nothing; storage refused is ignored.
 * Examples (checked in Chrome): after the warm-up → travel.feed.emotes holds the time, 60 and the emotes
 */
function save(limit: number, items: Emote[]): void {
  try {
    localStorage.setItem(SAVED, JSON.stringify({ at: Date.now(), size: limit, items }));
  } catch {
    // Storage refused (private mode): the next page asks again.
  }
}

let warm: Promise<Emote[]> | null = null;

/**
 * Asks 7TV for the "Emotes" row ahead of a tap (the splash, or the trip
 * page's first idle moment): at most two tries, six seconds each, once per
 * page. A failure is kept for the page, so the panel shows "Emotes didn't
 * load." with "Try again" rather than asking by itself.
 * Inputs: none. Output: the row's emotes; rejects after the second failed try.
 * Examples (checked in Chrome): the splash with 7TV up → one call, then the
 * panel's row draws with no call; 7TV down → two calls, then nothing more
 */
export function warmEmotes(): Promise<Emote[]> {
  warm ??= (async () => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await findEmotes("", 60, WARM_WAIT_MS);
      } catch (error) {
        if (attempt >= WARM_TRIES) throw error;
      }
    }
  })();
  return warm;
}

/**
 * The warm-up's answer for the "Emotes" row, if the warm-up has started on this page.
 * Inputs: none. Output: its promise, or null (the panel then asks when it opens, as on Save-Data).
 * Examples (checked in Chrome): after the warm-up → the same promise warmEmotes returned
 */
export function warmedEmotes(): Promise<Emote[]> | null {
  return warm;
}
