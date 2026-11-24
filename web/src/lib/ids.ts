/**
 * Makes a database id from a name, so the same name always gives the same
 * id. The trip script uses it for the expected crew, the areas and the
 * venues; the join sheet uses it for a typed name. That is how a typed
 * "Kai" joins as the listed "KAI", and how two phones that pick one name
 * become one member (plan, cases 5 and 6).
 *
 * Kept free of runtime-only TypeScript so that Node runs it as it is from
 * scripts/ (Node strips the types).
 *
 * Inputs: name — any text. Spaces at the ends are ignored.
 * Output: lower-case letters, digits and single hyphens, at most 40
 * characters. Accents fold to their letter. A name with no letter or digit
 * (an emoji alone) gives "u-" and the hex code of its first character,
 * so the id is never empty.
 * Examples:
 *   idFromName("Haad Rin")  → "haad-rin"
 *   idFromName("😀")         → "u-1f600"
 */
export function idFromName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  if (slug) return slug;
  const first = name.trim().codePointAt(0) ?? 0;
  return `u-${first.toString(16)}`;
}

/**
 * Makes the database key of an admin email, the same way the rules build
 * it from a signed-in account's email, so the key create-trip writes is the
 * key the rules look up. A key may not hold ".", so each "." becomes ",",
 * a character no email address uses.
 *
 * Inputs: email — an email address, as typed in local/trip.json or as
 * Google reports it.
 * Output: the email in lower case, with every "." replaced by ",".
 * Example:
 *   emailKey("Jo.Owner@Mail.Example.com") → "jo,owner@mail,example,com"
 */
export function emailKey(email: string): string {
  return email.toLowerCase().replaceAll(".", ",");
}
