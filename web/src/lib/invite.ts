/**
 * The invite title: the name a link preview gives the trip, in
 * "You're invited to “…”. Tap here to access". The organizer sets it on the
 * page (info/inviteTitle); scripts/stamp-preview.mjs writes it into the
 * page files at deploy time, because Messages and WhatsApp read those files,
 * not the app.
 *
 * Kept free of runtime-only TypeScript so that Node runs it as it is from
 * scripts/ (Node strips the types).
 */

/** The title until an organizer sets one. */
export const DEFAULT_INVITE_TITLE = "Indonesia/Thailand Trip 2027";

/** The longest title the rules accept. */
export const MAX_INVITE_TITLE = 60;

/** The live site; every link the organizer shares opens here, as scripts/create-trip.mjs prints them. */
export const SITE = "https://travel-ca8f9.web.app";

/**
 * Makes the links the "Invite" sheet hands out: the crew link, and with a
 * key, an organizer link. Both open the splash, as the links of
 * scripts/create-trip.mjs do.
 *
 * Inputs: tripId — the trip; key — an organizer key, or none for the crew link.
 * Output: the link.
 * Examples (each is a test in invite.test.ts):
 *   inviteLink("abc")        → "https://travel-ca8f9.web.app/?t=abc"
 *   inviteLink("abc", "K1")  → "https://travel-ca8f9.web.app/?t=abc&organizer=K1"
 */
export function inviteLink(tripId: string, key?: string): string {
  return `${SITE}/?t=${tripId}${key ? `&organizer=${key}` : ""}`;
}

/**
 * Makes the line a link preview shows, from the invite title. The Edit
 * invite sheet shows it as the friend will read it; the stamp script
 * escapes it and writes it into the page files.
 *
 * Inputs: title — the invite title, as saved.
 * Output: the line, with curly quotes.
 * Example:
 *   inviteLine("Indonesia/Thailand Trip 2027") → "You’re invited to “Indonesia/Thailand Trip 2027”. Tap here to access"
 */
export function inviteLine(title: string): string {
  return `You’re invited to “${title}”. Tap here to access`;
}

/**
 * Makes text safe inside an HTML attribute or element, so a title the
 * organizer typed can never close the meta tag it sits in.
 *
 * Inputs: text — any text.
 * Output: the text with &, <, >, " and ' as character references.
 * Examples:
 *   escapeHtml("Bali & Koh Phangan") → "Bali &amp; Koh Phangan"
 *   escapeHtml('"><script>')         → "&quot;&gt;&lt;script&gt;"
 */
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
