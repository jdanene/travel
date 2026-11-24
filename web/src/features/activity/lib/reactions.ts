import type { MemberId } from "../../../types/trip";

/**
 * The Feed's emoji rules, kept apart from the screen so they can be tested:
 * how a reaction is stored, how an emote is written into a message, and how
 * the reactions on one line group into Discord's pills.
 *
 * A reaction is stored as activityReactions/{line}/{member}/{key} = the time
 * it was added. The key is a legal database key for every emoji:
 *   - a standard emoji is its Twemoji file name, the code points in hex
 *     joined by "-" ("1f525" for 🔥, "23-20e3" for #️⃣), so "#", "*" and
 *     other characters a key may not hold never reach the database;
 *   - an emote from 7TV is "7tv-" + its 26-character id + "-" + its name.
 * database.rules.json holds the same pattern (REACTION_KEY).
 */

/** An emote from 7TV: its id on 7TV's CDN and the name it is typed by. */
export interface Emote {
  id: string;
  name: string;
}

/** What a friend picks in the emoji grid: a standard emoji (its character) or an emote. */
export type EmojiChoice = { kind: "emoji"; char: string } | { kind: "emote"; emote: Emote };

/** 7TV ids are ULIDs: 26 characters of Crockford base 32. */
const EMOTE_ID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
/** The emote names this app stores: 7TV's own name rule, cut to 40 characters. */
const EMOTE_NAME = /^[A-Za-z0-9_():-]{1,40}$/;
/** database.rules.json checks every reaction key against this pattern. */
export const REACTION_KEY = /^([0-9a-f]{1,6}(-[0-9a-f]{1,6}){0,9}|7tv-[0-9A-HJKMNP-TV-Z]{26}-[A-Za-z0-9_():-]{1,40})$/;

/**
 * Says whether an emote can be stored and drawn: an id 7TV could have made
 * and a name this app accepts. Emotes with other names are left out of the grid.
 * Inputs: the emote. Output: true or false.
 * Examples (each is a test in reactions.test.ts):
 *   { id: "01FCY771D800007PQ2DF3GDTN6", name: "RainTime" } → true
 *   { id: "01FCY771D800007PQ2DF3GDTN6", name: "two words" } → false
 */
export function usableEmote(emote: Emote): boolean {
  return EMOTE_ID.test(emote.id) && EMOTE_NAME.test(emote.name);
}

/**
 * The code points of an emoji as Twemoji names its file: lower-case hex
 * joined by "-", with U+FE0F dropped unless the emoji joins parts with
 * U+200D (Twemoji's own rule, so the key and the picture's file agree).
 * Inputs: one emoji character (or sequence). Output: the code point string.
 * Examples (each is a test in reactions.test.ts):
 *   "🔥"  → "1f525"
 *   "❤️"  → "2764"
 *   "#️⃣"  → "23-20e3"
 *   "👩‍💻" → "1f469-200d-1f4bb"
 */
export function codepoints(char: string): string {
  const raw = char.includes("‍") ? char : char.replace(/️/g, "");
  return [...raw].map((part) => part.codePointAt(0)!.toString(16)).join("-");
}

/**
 * The stored key of a pick.
 * Inputs: the choice. Output: its key (see the module note).
 * Examples (each is a test in reactions.test.ts):
 *   🔥                                   → "1f525"
 *   emote RainTime 01FCY771D800007PQ2DF3GDTN6 → "7tv-01FCY771D800007PQ2DF3GDTN6-RainTime"
 */
export function reactionKey(choice: EmojiChoice): string {
  return choice.kind === "emoji" ? codepoints(choice.char) : `7tv-${choice.emote.id}-${choice.emote.name}`;
}

/**
 * Reads a stored key back into what to draw.
 * Inputs: a key. Output: the choice, or null for a key this app did not write.
 * Examples (each is a test in reactions.test.ts):
 *   "1f525"                                  → emoji "🔥"
 *   "23-20e3"                                → emoji "#⃣" (drawn from Twemoji's 23-20e3.svg)
 *   "7tv-01FCY771D800007PQ2DF3GDTN6-RainTime" → emote RainTime
 *   "nope"                                   → null
 */
export function readKey(key: string): EmojiChoice | null {
  if (!REACTION_KEY.test(key)) return null;
  if (key.startsWith("7tv-")) return { kind: "emote", emote: { id: key.slice(4, 30), name: key.slice(31) } };
  const parts = key.split("-").map((hex) => parseInt(hex, 16));
  if (parts.some((part) => part > 0x10ffff)) return null;
  return { kind: "emoji", char: String.fromCodePoint(...parts) };
}

/** One pill under a Feed line: an emoji, who added it, and whether you did. */
export interface ReactionPill {
  key: string;
  choice: EmojiChoice;
  /** Members who added it, in the order they did. */
  who: MemberId[];
  mine: boolean;
}

/**
 * Groups the reactions on one line into pills, as Discord shows them: one
 * pill per emoji, in the order each emoji was first added, so pills never
 * jump when a count changes. A member may add several different emoji.
 * The first version stored one emoji per member as a plain string; that
 * shape still reads, as that emoji added at time 0.
 *
 * Inputs: raw — activityReactions/{line} as stored (member → { key: time },
 * or member → emoji string); memberId — this device's member.
 * Output: the pills; keys this app cannot read are skipped.
 * Examples (each is a test in reactions.test.ts):
 *   { ka: { "1f525": 2 }, rb: { "1f525": 3, "1f602": 1 } }, rb → 😂 [rb] mine, 🔥 [ka, rb] mine
 *   { ka: "🔥" } (the old shape), rb                              → 🔥 [ka], not mine
 *   undefined                                                     → []
 */
export function groupReactions(raw: Record<MemberId, Record<string, number> | string> | undefined, memberId: MemberId): ReactionPill[] {
  const marks: { key: string; who: MemberId; at: number }[] = [];
  for (const [who, value] of Object.entries(raw ?? {})) {
    if (typeof value === "string") marks.push({ key: codepoints(value), who, at: 0 });
    else if (value && typeof value === "object") for (const [key, at] of Object.entries(value)) marks.push({ key, who, at: typeof at === "number" ? at : 0 });
  }
  marks.sort((a, b) => a.at - b.at || (a.who < b.who ? -1 : 1));
  const pills = new Map<string, ReactionPill>();
  for (const mark of marks) {
    const choice = readKey(mark.key);
    if (!choice) continue;
    const pill = pills.get(mark.key) ?? { key: mark.key, choice, who: [], mine: false };
    if (!pill.who.includes(mark.who)) pill.who.push(mark.who);
    if (mark.who === memberId) pill.mine = true;
    pills.set(mark.key, pill);
  }
  return [...pills.values()];
}

/** How an emote sits inside a message's text: Discord's own token, <:name:id>. */
const EMOTE_TOKEN = /<:([A-Za-z0-9_():-]{1,40}):([0-9A-HJKMNP-TV-Z]{26})>/g;

/** A piece of a message: plain words, or an emote to draw. Standard emoji stay in the words. */
export type TextPiece = { kind: "text"; text: string } | { kind: "emote"; emote: Emote };

/**
 * Splits a message into words and emotes, so the feed can draw each emote
 * from 7TV and leave everything else as text.
 * Inputs: the stored text. Output: the pieces in order.
 * Examples (each is a test in reactions.test.ts):
 *   "gm <:catJAM:01FCY771D800007PQ2DF3GDTN6>!" → text "gm ", emote catJAM, text "!"
 *   "no emotes"                                 → text "no emotes"
 */
export function splitEmotes(text: string): TextPiece[] {
  const pieces: TextPiece[] = [];
  let at = 0;
  for (const match of text.matchAll(EMOTE_TOKEN)) {
    if (match.index! > at) pieces.push({ kind: "text", text: text.slice(at, match.index) });
    pieces.push({ kind: "emote", emote: { name: match[1], id: match[2] } });
    at = match.index! + match[0].length;
  }
  if (at < text.length) pieces.push({ kind: "text", text: text.slice(at) });
  return pieces;
}

/**
 * Turns the ":name:" an emote shows as in the message bar into the stored
 * token, for the emotes picked while writing this message. A ":name:" the
 * friend typed by hand, with no pick behind it, stays as typed.
 * Inputs: the text as typed; picked — emote name to id, from this draft.
 * Output: the text to store.
 * Examples (each is a test in reactions.test.ts):
 *   "gm :catJAM:", { catJAM: "01FCY771D800007PQ2DF3GDTN6" } → "gm <:catJAM:01FCY771D800007PQ2DF3GDTN6>"
 *   "gm :nope:", {}                                          → "gm :nope:"
 */
export function withEmoteTokens(text: string, picked: Record<string, string>): string {
  return text.replace(/:([A-Za-z0-9_()-]{1,40}):/g, (whole, name: string) => (picked[name] ? `<:${name}:${picked[name]}>` : whole));
}
