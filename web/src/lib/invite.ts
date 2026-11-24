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
