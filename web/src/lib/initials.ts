/**
 * The one or two letters that stand for a friend everywhere on the page
 * (JD, TO, KA in the mock). Shared, because every "who" list draws them.
 *
 * Inputs: name — a friend's name as typed: any script, accents, emoji.
 * Output: upper case, one or two characters, never empty. Two words or more
 * give the first letter of the first and the last word; one word gives its
 * first two letters; a name with one character gives that character.
 * Examples (checked by hand; the owner keeps tests to the risky rules):
 *   initials("Kai Adeyemi")   → "KA"
 *   initials("Rob")           → "RO"
 *   initials("  ")            → "?"
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = (word: string) => [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(word)].map((s) => s.segment);
  const first = letters(words[0]);
  const picked = words.length > 1 ? [first[0], letters(words[words.length - 1])[0]] : first.slice(0, 2);
  return picked.join("").toLocaleUpperCase();
}
