import type { LinkItem } from "../../../types/trip";

/**
 * Reads pasted text as a link. Any https address is accepted (case 44).
 * Inputs: text — whatever the friend pasted.
 * Output: the URL, or null when it is not an https address (case 43: no call).
 * Examples (checked by hand): "https://vm.tiktok.com/ZM1/" → the URL; "the beach club" → null
 */
export function parseLink(text: string): URL | null {
  try {
    const url = new URL(text.trim());
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Which site a link is on, for the card's tile and the reader.
 * Inputs: url — an https address.
 * Output: "instagram", "tiktok", or "other".
 * Examples (checked by hand): https://vm.tiktok.com/ZM1/ → "tiktok"; https://youtu.be/x → "other"
 */
export function siteOf(url: URL): LinkItem["site"] {
  const host = url.hostname.replace(/^(www|m)\./, "");
  if (host === "instagram.com") return "instagram";
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
  return "other";
}

/**
 * The id of a saved link, made from its address, so the same link saved
 * twice, by one friend or two at once, is one card (case 45). The query
 * string goes, because share links add one (?igsh=…), and so do "www."
 * and a trailing slash.
 *
 * Inputs: url — an https address.
 * Output: lower-case letters, digits and hyphens, at most 120 characters.
 * Examples (tests in links.test.ts):
 *   https://www.tiktok.com/@club/video/7301        → "tiktok-com-club-video-7301"
 *   https://www.instagram.com/reel/Cx1/?igsh=abc   → the id of https://instagram.com/reel/Cx1/
 */
export function linkId(url: string): string {
  const address = new URL(url);
  const host = address.hostname.replace(/^(www|m)\./, "");
  return `${host}${address.pathname}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

/** The name on a card's tile when it has no thumbnail (case 47). */
export function siteName(item: Pick<LinkItem, "site" | "url">): string {
  if (item.site === "instagram") return "Instagram";
  if (item.site === "tiktok") return "TikTok";
  return new URL(item.url).hostname.replace(/^www\./, "");
}
