import Database from "emoji-picker-element/database.js";
import dataUrl from "emoji-picker-element-data/en/emojibase/data.json?url";
import { codepoints, reactionKey, readKey, type EmojiChoice } from "./reactions";

/**
 * Where the Feed's emoji come from: Twemoji's pictures (the set Discord
 * draws), served by this site from /app/twemoji/ (vite.config.ts copies
 * them out of @twemoji/svg), the emoji list and its search (emoji-picker-
 * element's Database over the self-hosted emojibase file), and this
 * device's "Frequently Used" picks.
 */

/** Twemoji 15.0 draws every emoji up to Unicode's emoji 15.0; newer ones have no picture yet, so the grid leaves them out. */
const TWEMOJI_VERSION = 15;

/**
 * The address of an emoji's Twemoji picture on this site.
 * Inputs: the emoji character. Output: the URL.
 * Examples (checked on screen): "🔥" → "/app/twemoji/1f525.svg"
 */
export function twemojiUrl(char: string): string {
  return `${import.meta.env.BASE_URL}twemoji/${codepoints(char)}.svg`;
}

/**
 * The address of a 7TV emote's picture on 7TV's CDN, at twice its size for sharp screens.
 * Inputs: the emote's id. Output: the URL.
 * Examples (checked on screen): "01FCY771D800007PQ2DF3GDTN6" → "https://cdn.7tv.app/emote/01FCY771D800007PQ2DF3GDTN6/2x.webp"
 */
export function emoteUrl(id: string): string {
  return `https://cdn.7tv.app/emote/${id}/2x.webp`;
}

/** One standard emoji as the grid shows it. */
export interface EmojiItem {
  char: string;
  /** Its name, for search, the hover label and screen readers ("fire"). */
  name: string;
}

/** The emoji groups in Discord's order, each with the emoji its tab shows. Group 2 (skin-tone parts) is not a group people pick from. */
export const GROUPS: { id: number; label: string; icon: string }[] = [
  { id: 0, label: "Smileys & Emotion", icon: "😀" },
  { id: 1, label: "People & Body", icon: "👋" },
  { id: 3, label: "Animals & Nature", icon: "🐻" },
  { id: 4, label: "Food & Drink", icon: "🍔" },
  { id: 5, label: "Travel & Places", icon: "✈️" },
  { id: 6, label: "Activities", icon: "⚽" },
  { id: 7, label: "Objects", icon: "💡" },
  { id: 8, label: "Symbols", icon: "❤️" },
  { id: 9, label: "Flags", icon: "🏁" },
];

let database: Database | null = null;
const db = () => (database ??= new Database({ dataSource: dataUrl }));
let groups: Promise<Map<number, EmojiItem[]>> | null = null;

/**
 * Every emoji the grid shows, by group, loaded once per page (the first
 * load fills IndexedDB from the self-hosted file; later visits read it).
 * A failed load is forgotten, so the next opening tries again.
 * Inputs: none. Output: group id → its emoji, in Unicode's order.
 * Examples (checked on screen): the first opening of the reaction sheet → Smileys & Emotion starts with 😀
 */
export function loadGroups(): Promise<Map<number, EmojiItem[]>> {
  groups ??= Promise.all(
    GROUPS.map(async ({ id }) => [id, (await db().getEmojiByGroup(id)).filter((emoji) => emoji.version <= TWEMOJI_VERSION).map((emoji) => ({ char: emoji.unicode, name: emoji.annotation }))] as const),
  ).then(
    (pairs) => new Map(pairs),
    (error) => {
      groups = null;
      throw error;
    },
  );
  return groups;
}

/**
 * Finds emoji by name, tag or shortcode ("fire" → 🔥 and friends).
 * Inputs: the words typed. Output: the matches, best first; [] for nothing.
 * Examples (checked on screen): "fire" → 🔥 first, then 🧯 🚒 …
 */
export async function searchEmoji(query: string): Promise<EmojiItem[]> {
  const words = query.trim();
  if (!words) return [];
  const found = await db().getEmojiBySearchQuery(words);
  const q = words.toLowerCase();
  // Best first, as Discord ranks: the name itself, then a name that starts with the words, then the rest in Unicode's order.
  const rank = (name: string) => (name === q ? 0 : name.startsWith(q) ? 1 : 2);
  return found
    .flatMap((emoji) => ("unicode" in emoji && emoji.version <= TWEMOJI_VERSION ? [{ char: emoji.unicode, name: emoji.annotation }] : []))
    .map((emoji, at) => ({ emoji, at, rank: rank(emoji.name.toLowerCase()) }))
    .sort((a, b) => a.rank - b.rank || a.at - b.at)
    .map(({ emoji }) => emoji);
}

const RECENT = "travel.feed.recentEmoji";
/** Discord's usual first row, until this device has picks of its own. */
const STARTERS = ["👍", "❤️", "😂", "🔥", "🙏", "😭", "🤣", "💯", "👀", "🚀", "💀", "🎉"];
const MAX_RECENT = 20;

/**
 * "Frequently Used": this device's latest picks, newest first, topped up
 * with the starters so the row is never empty. Kept in localStorage; a
 * browser that refuses storage just sees the starters.
 * Inputs: none. Output: up to 20 choices.
 * Examples (checked on screen): a fresh browser → 👍 ❤️ 😂 🔥 …; after picking 🫠 → 🫠 👍 ❤️ …
 */
export function recentChoices(): EmojiChoice[] {
  let keys: string[] = [];
  try {
    keys = JSON.parse(localStorage.getItem(RECENT) ?? "[]");
  } catch {
    keys = [];
  }
  const all = [...(Array.isArray(keys) ? keys : []), ...STARTERS.map((char) => codepoints(char))];
  return [...new Set(all)]
    .slice(0, MAX_RECENT)
    .map(readKey)
    .filter((choice): choice is EmojiChoice => choice !== null);
}

/**
 * Puts a pick at the front of "Frequently Used".
 * Inputs: the choice. Output: nothing.
 * Examples (checked on screen): pick 🫠 → it leads the row next time
 */
export function rememberChoice(choice: EmojiChoice): void {
  const key = reactionKey(choice);
  try {
    const old: unknown = JSON.parse(localStorage.getItem(RECENT) ?? "[]");
    const keys = Array.isArray(old) ? old.filter((item): item is string => typeof item === "string" && item !== key) : [];
    localStorage.setItem(RECENT, JSON.stringify([key, ...keys].slice(0, MAX_RECENT)));
  } catch {
    // Storage refused (private mode): the row keeps the starters.
  }
}
