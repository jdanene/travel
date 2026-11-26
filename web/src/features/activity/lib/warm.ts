import dataUrl from "emoji-picker-element-data/en/emojibase/data.json?url";
import { emoteUrl, GROUPS, loadGroups, readySearch, recentChoices, twemojiUrl } from "./emoji";
import { warmOrder } from "./emojiSet";
import { warmEmotes } from "./emotes";

/**
 * Readies the emoji panel before anyone taps it (owner, 25 Nov 2026:
 * "everything should be loaded at the splash"). The splash runs it while
 * it plays (app/prewarmEmoji.ts), and the trip page runs it at its first
 * idle moment, for a friend who came straight to the trip.
 */

/** Pictures fetched at once (each under 1 KB compressed, at low priority): enough to hide the link's delay, few enough to leave room for the page's own loads. */
const AT_ONCE = 16;
/** Failed fetches (no connection) after which the warm-up stops, so an offline phone makes no stream of errors. */
const GIVE_UP_AFTER = 3;
/** This device fetched every grid picture for this emoji file (the pictures are cached for a year, by name). */
const DONE = "travel.feed.emojiWarm";

let running: Promise<void> | null = null;

/**
 * Fetches what the emoji panel shows into the browser's cache, most needed
 * first, at most sixteen at a time, low priority, once per page: the grid's
 * list (the emoji file), the first screen's Twemoji pictures (Frequently
 * Used, the group strip, the first rows of Smileys), 7TV's "Emotes" row and
 * its pictures, the search index (IndexedDB), then every other picture in
 * the grid's order. Pictures are fetched, not drawn, so nothing is decoded
 * until the panel shows it. A device that fetched them all for this emoji
 * file skips them next time. Offline, it does nothing. On Save-Data or a 2g link it fetches the
 * list and the first screen only (about 60 KB), not the rest (about 1.5 MB)
 * nor 7TV's pictures (about 2.5 MB). It stops after three failed fetches,
 * and every failure is silent: a picture it missed loads when shown, as before.
 *
 * Inputs: none. Output: resolves when done or stopped; never rejects.
 * Examples (checked in Chrome on the emulator):
 *   a fresh profile on the splash → the emoji file, ~100 first-screen pictures, one 7TV call and 60 emote pictures, then ~1,770 more pictures
 *   the next visit               → the emoji file from the cache, 7TV's row from the device, no picture fetched
 *   the link drops mid-way       → a few failed fetches, then it stops
 */
export function warmEmojiPanel(): Promise<void> {
  running ??= warmUp().catch(() => undefined);
  return running;
}

async function warmUp(): Promise<void> {
  const net = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const lean = !!net && (net.saveData === true || /2g/.test(net.effectiveType ?? ""));
  if (!navigator.onLine) return;
  // 7TV first, as it is the slowest to answer (or read from the device); its pictures wait for the first screen.
  const row = lean ? null : warmEmotes();
  // Its failure is shown by the panel ("Emotes didn't load."); here it is only noted, so the console stays quiet.
  row?.catch(() => undefined);
  const groups = await loadGroups();
  let done = false;
  try {
    done = localStorage.getItem(DONE) === dataUrl;
  } catch {
    // Storage refused: fetch again; every picture is a cache hit.
  }
  const { first, rest } = warmOrder(
    recentChoices().flatMap((choice) => (choice.kind === "emoji" ? [choice.char] : [])),
    GROUPS.map((group) => group.icon),
    GROUPS.map((group) => (groups.get(group.id) ?? []).map((emoji) => emoji.char)),
  );
  const fetcher = new Fetcher();
  if (!done) await fetcher.all(first.map(twemojiUrl));
  if (!row) return;
  // 7TV's row and the search index side by side: one waits on 7TV, the other on this device's storage.
  await Promise.all([
    row.then(
      (emotes) => fetcher.all(emotes.map((emote) => emoteUrl(emote.id)), true),
      () => undefined,
    ),
    readySearch().catch(() => undefined),
  ]);
  if (done) return;
  await fetcher.all(rest.map(twemojiUrl));
  if (fetcher.failed === 0) {
    try {
      localStorage.setItem(DONE, dataUrl);
    } catch {
      // Storage refused: the next page checks the cache again.
    }
  }
}

/** Fetches into the cache, a few at a time, and stops for good after a few failures. */
class Fetcher {
  failed = 0;

  /**
   * Fetches every address, at most AT_ONCE at a time, and reads each answer
   * through so the browser keeps it. An answer like 404 is fine (that file
   * is missing, not the connection); a failed fetch counts, and after three
   * nothing more is fetched.
   * Inputs: the addresses; whether they are another site's (7TV's CDN), fetched as an <img> would, with no referrer.
   * Output: resolves when all are done or skipped.
   * Examples (checked in Chrome): 100 Twemoji files → 100 requests, 16 in flight at most
   */
  async all(urls: string[], elsewhere = false): Promise<void> {
    let next = 0;
    const lane = async () => {
      while (next < urls.length && this.failed < GIVE_UP_AFTER) {
        const url = urls[next++];
        try {
          const answer = await fetch(url, elsewhere ? { mode: "no-cors", credentials: "include", referrerPolicy: "no-referrer", priority: "low" } : { priority: "low" });
          await answer.arrayBuffer();
        } catch {
          this.failed++;
        }
      }
    };
    await Promise.all(Array.from({ length: AT_ONCE }, lane));
  }
}
