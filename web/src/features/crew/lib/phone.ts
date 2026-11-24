/**
 * The optional phone for trip texts: the country codes the picker offers,
 * and the rule that turns what a friend typed into one E.164 number
 * ("+14155550123"), the form AWS sends to and the database rules accept.
 */

/** The picker's countries: the crew's likely homes first, then the trip's own countries. +1 is the default. */
export const COUNTRIES: Array<{ code: string; name: string }> = [
  { code: "1", name: "US / Canada" },
  { code: "44", name: "UK" },
  { code: "353", name: "Ireland" },
  { code: "61", name: "Australia" },
  { code: "64", name: "New Zealand" },
  { code: "49", name: "Germany" },
  { code: "33", name: "France" },
  { code: "31", name: "Netherlands" },
  { code: "34", name: "Spain" },
  { code: "39", name: "Italy" },
  { code: "971", name: "UAE" },
  { code: "91", name: "India" },
  { code: "234", name: "Nigeria" },
  { code: "27", name: "South Africa" },
  { code: "52", name: "Mexico" },
  { code: "55", name: "Brazil" },
  { code: "62", name: "Indonesia" },
  { code: "66", name: "Thailand" },
  { code: "65", name: "Singapore" },
];

export const DEFAULT_COUNTRY = "1";

/**
 * Turns a typed phone number into E.164. Spaces, dashes, dots and
 * brackets are ignored. A number typed with a leading "+" carries its own
 * country, whatever the picker says. Otherwise the picker's code goes in
 * front: for +1 a leading 1 is dropped, and the rest must be ten digits
 * with an area code that does not start with 0 or 1; for any other
 * country one leading 0 (the trunk prefix) is dropped.
 *
 * Inputs: country — the picker's code without "+" ("1", "44"); typed — the field as typed.
 * Output: "+" and 8 to 15 digits, or null when it cannot be a phone number.
 * Examples (all fictional numbers):
 *   toE164("1", "(415) 555-0123")     → "+14155550123"
 *   toE164("1", "1 415 555 0123")     → "+14155550123"
 *   toE164("44", "07700 900123")      → "+447700900123"
 *   toE164("1", "+62 812 3456 7890")  → "+6281234567890"   (a typed + wins over the picker)
 *   toE164("1", "555-0123")           → null               (seven digits is not a US number)
 */
export function toE164(country: string, typed: string): string | null {
  const trimmed = typed.trim();
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  if (country === "1") {
    const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    return /^[2-9]\d{9}$/.test(national) ? `+1${national}` : null;
  }
  const full = country + digits.replace(/^0/, "");
  return /^[1-9]\d{7,14}$/.test(full) ? `+${full}` : null;
}

/**
 * Writes an E.164 number the way a friend reads one: +1 numbers in the
 * US form, others as the country code and the rest.
 *
 * Inputs: e164 — a number toE164() made.
 * Output: the number for the screen.
 * Examples:
 *   showPhone("+14155550123")   → "+1 (415) 555-0123"
 *   showPhone("+447700900123")  → "+447700900123"
 */
export function showPhone(e164: string): string {
  const us = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return us ? `+1 (${us[1]}) ${us[2]}-${us[3]}` : e164;
}
