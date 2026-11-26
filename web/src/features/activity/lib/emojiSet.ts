/**
 * The emoji grid's contents as pure rules, kept apart from the browser so
 * they can be tested: how the self-hosted emoji file becomes the grid's
 * groups, and in what order the panel's pictures are fetched ahead of a tap.
 */

/** One emoji as the self-hosted emojibase file holds it (emoji-picker-element-data). */
export interface RawEmoji {
  emoji: string;
  annotation: string;
  group?: number;
  order?: number;
  version?: number;
}

/** One standard emoji as the grid shows it. */
export interface EmojiItem {
  char: string;
  /** Its name, for search, the hover label and screen readers ("fire"). */
  name: string;
}

/**
 * The grid's groups from the emoji file: each wanted group's emoji in
 * Unicode's order, without the ones newer than the pictures (Twemoji draws
 * up to a version). An entry with no group or a newer version is left out;
 * a wanted group with nothing in the file is an empty list.
 * Inputs: the file's entries; the group ids wanted; the newest version drawn.
 * Output: group id → its emoji.
 * Examples (each is a test in emojiSet.test.ts):
 *   [{ emoji: "😃", annotation: "grinning face with big eyes", group: 0, order: 2, version: 1 },
 *    { emoji: "😀", annotation: "grinning face", group: 0, order: 1, version: 1 }], [0], 15
 *     → 0 → [😀 "grinning face", 😃 "grinning face with big eyes"]
 *   [{ emoji: "🫨", annotation: "shaking face", group: 0, order: 9, version: 15.1 }], [0, 1], 15
 *     → 0 → [], 1 → []
 */
export function groupEmoji(data: RawEmoji[], groupIds: number[], maxVersion: number): Map<number, EmojiItem[]> {
  const groups = new Map<number, (RawEmoji & { order: number })[]>(groupIds.map((id) => [id, []]));
  for (const entry of data) {
    const list = entry.group === undefined ? undefined : groups.get(entry.group);
    if (list && typeof entry.emoji === "string" && (entry.version ?? 0) <= maxVersion) list.push({ ...entry, order: entry.order ?? 0 });
  }
  return new Map(
    [...groups].map(([id, list]) => [id, list.sort((a, b) => a.order - b.order).map((entry) => ({ char: entry.emoji, name: entry.annotation }))]),
  );
}

/** How many of the first group's emoji the panel shows before any scroll, on the widest panel (about 11 a row, 6 rows), with a margin. */
export const FIRST_SCREEN_CELLS = 80;

/**
 * The order the panel's pictures are fetched ahead of a tap: first what
 * the panel shows before any scroll ("Frequently Used", the group strip,
 * the first rows of the first group), then every other emoji in the grid's
 * own order, top to bottom, so a scroll meets pictures already fetched.
 * Each character appears once.
 * Inputs: the "Frequently Used" characters; the group strip's icons; the
 * groups in the grid's order.
 * Output: { first, rest }, characters.
 * Examples (each is a test in emojiSet.test.ts):
 *   ["👍"], ["😀"], [["😀", "😃", …80 more], ["👋"]] → first: 👍 😀 😃 … (the first 80 of the group), rest: the group's others, then 👋
 *   ["😀"], ["😀"], [["😀"]]                          → first: ["😀"], rest: []
 */
export function warmOrder(recent: string[], icons: string[], groups: string[][]): { first: string[]; rest: string[] } {
  const seen = new Set<string>();
  const once = (list: string[]) => list.filter((char) => !seen.has(char) && seen.add(char));
  const first = once([...recent, ...icons, ...(groups[0] ?? []).slice(0, FIRST_SCREEN_CELLS)]);
  const rest = once(groups.flat());
  return { first, rest };
}
