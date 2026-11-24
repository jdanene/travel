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
 * the grid costs no call.
 */

const API = "https://7tv.io/v3/gql";
// A word 7TV has not been asked lately can take several seconds on its side; still bounded.
const WAIT_MS = 15000;
const QUERY = `query Emotes($q: String!, $limit: Int!) {
  emotes(query: $q, limit: $limit, page: 1, sort: { value: "popularity", order: DESCENDING },
    filter: { exact_match: false, ignore_tags: false, zero_width: false, animated: false }) { items { id name } }
}`;

const kept = new Map<string, Promise<Emote[]>>();

/**
 * 7TV's emotes matching some words, most used first; "" gives the most
 * used of all (the grid's "Emotes" row before any search).
 * Inputs: the words; how many at most. Output: the emotes this app can
 * store (see usableEmote); a failure rejects and is forgotten, so "Try
 * again" asks once more.
 * Examples (checked against 7tv.io on 24 Nov 2026):
 *   ""     → GIGACHAD, catJAM, COPIUM, Prayge, …
 *   "pepe" → emotes named or tagged pepe
 */
export function findEmotes(words: string, limit = 60): Promise<Emote[]> {
  const q = words.trim();
  const id = `${q}|${limit}`;
  const old = kept.get(id);
  if (old) return old;
  const asked = fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { q, limit } }),
    signal: AbortSignal.timeout(WAIT_MS),
  })
    .then(async (answer) => {
      if (!answer.ok) throw new Error(`7TV answered ${answer.status}`);
      const body = (await answer.json()) as { data?: { emotes?: { items?: Emote[] } } };
      return (body.data?.emotes?.items ?? []).map(({ id: emoteId, name }) => ({ id: emoteId, name })).filter(usableEmote);
    })
    .catch((error: unknown) => {
      kept.delete(id);
      throw error;
    });
  kept.set(id, asked);
  return asked;
}
