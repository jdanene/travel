/**
 * Reads a pasted text as an Airbnb or Booking.com link.
 * Inputs: text — whatever the friend pasted.
 * Output: the URL when it is an https address on airbnb.<any>, abnb.me or
 * booking.com; otherwise null, and no call is made (case 15).
 * Examples (checked by hand):
 *   "https://www.airbnb.com/rooms/1"   → the URL
 *   "villa in Uluwatu"                 → null
 */
export function listingLink(text: string): URL | null {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m)\./, "");
  const listing = /^airbnb\.[a-z.]+$/.test(host) || host === "abnb.me" || host === "booking.com";
  return url.protocol === "https:" && listing ? url : null;
}

/**
 * The id of a stay option, made from its listing address, so the same
 * listing pasted twice, by one friend or two at once, is one card (case 17).
 * The query string goes (dates, guests), Airbnb's country domains count as
 * one, and Booking.com's language suffix goes.
 *
 * Inputs: url — a listing address.
 * Output: lower-case letters, digits and hyphens, at most 120 characters.
 * Examples (tests in stay.test.ts):
 *   https://www.airbnb.com/rooms/12345?check_in=…  → "airbnb-rooms-12345"
 *   https://www.airbnb.co.uk/rooms/12345           → the same id
 */
export function stayId(url: string): string {
  const address = new URL(url);
  const host = address.hostname.replace(/^(www|m)\./, "");
  const site = host.startsWith("airbnb.") ? "airbnb" : host.replace(/\.[a-z]+$/, "");
  const path = address.pathname.replace(/\.[a-z]{2}(-[a-z]{2})?\.html$/, "").replace(/\.html$/, "");
  return `${site}${path}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}
