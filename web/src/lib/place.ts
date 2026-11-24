/**
 * How the page names a place: "Bali, Indonesia" (owner, 24 Nov 2026:
 * "don't just say Bali, say Bali, Indonesia"). One rule, so a destination
 * heading, a venue line and a search suggestion name a place the same way.
 * The name is left alone when it already ends with its country, so a
 * search's "Haad Khuat, Thailand" never reads "Thailand, Thailand".
 *
 * Inputs: name — the place's name; country — its country, if the data has one.
 * Output: "name, country", or the name alone when there is no country.
 * Examples (each is a test in place.test.ts):
 *   placeName("Bali", "Indonesia")                   → "Bali, Indonesia"
 *   placeName("Bali")                                → "Bali"
 *   placeName("Haad Khuat, Thailand", "Thailand")    → "Haad Khuat, Thailand"
 */
export function placeName(name: string, country?: string): string {
  const own = name.trim();
  const land = country?.trim();
  if (!land || own.toLowerCase().endsWith(land.toLowerCase())) return own;
  return `${own}, ${land}`;
}
