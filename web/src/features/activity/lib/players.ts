/**
 * Instagram and TikTok videos in the Feed (exception 36): which addresses
 * in a message's words play in place, and the player each one gets.
 * Nothing is stored; the Feed reads it from the words each time it draws.
 */

export type VideoSite = "instagram" | "tiktok";

/** A piece of a message's words: plain text, or an Instagram or TikTok address drawn as a link. */
export type Piece = { kind: "text"; text: string } | { kind: "link"; href: string; label: string };

/** The message's first video: its player when the address holds the id, else the short link to look up. */
export interface Video {
  site: VideoSite;
  /** The address as the friend wrote it, for the link that opens the site. */
  href: string;
  /** The player's address, when the address holds the post's id. */
  player?: string;
  /** A short or share link whose id must be looked up first (the link reader's ?resolve). */
  lookup?: string;
}

export interface Message {
  pieces: Piece[];
  video: Video | null;
  /** True when the words are the video's address and nothing else: the player stands alone. */
  linkOnly: boolean;
}

// An address runs to the next space; what ends a sentence is not part of it.
const ADDRESS = /https?:\/\/[^\s<>"]+/gi;
const TRAILING = /[.,!?;:'")\]}…]+$/;
const INSTAGRAM = /^(?:www\.|m\.)?instagram\.com$/;
const TIKTOK = /^(?:(?:www|m|vm|vt)\.)?tiktok\.com$/;

/**
 * Reads a message's words for Instagram and TikTok addresses. Each becomes
 * a link; the first one that is a video (or a short link that may be one)
 * also gets the player. Addresses on other sites stay plain text.
 *
 * Inputs: text — a message's or a reply's stored words.
 * Output: the pieces to draw in order, the first video, and whether the
 * words are that video's address alone.
 * Examples (tests in players.test.ts):
 *   "https://www.instagram.com/reel/C6HpUPegvtc/?igsh=x"
 *     → one link, video { player: "https://www.instagram.com/reel/C6HpUPegvtc/embed/" }, linkOnly
 *   "lol https://vm.tiktok.com/ZMkyTWLpV/!!"
 *     → "lol ", the link (no "!!"), "!!"; video { lookup: "https://vm.tiktok.com/ZMkyTWLpV/" }
 *   "see https://example.com" → one text piece, no video
 *   "https://www.instagram.com/savayabali/" → a link, no video (a profile)
 */
export function readMessage(text: string): Message {
  const pieces: Piece[] = [];
  let video: Video | null = null;
  let from = 0;
  for (const found of text.matchAll(ADDRESS)) {
    const href = found[0].replace(TRAILING, "");
    const url = parse(href);
    const site = url && siteOf(url);
    if (!url || !site) continue;
    const start = found.index ?? 0;
    if (start > from) pieces.push({ kind: "text", text: text.slice(from, start) });
    pieces.push({ kind: "link", href, label: labelOf(url) });
    from = start + href.length;
    if (!video) {
      const player = playerOf(url);
      if (player) video = { site, href, player };
      else if (isShortLink(url)) video = { site, href, lookup: url.href };
    }
  }
  if (from < text.length) pieces.push({ kind: "text", text: text.slice(from) });
  const linkOnly = !!video && pieces.every((piece) => (piece.kind === "link" ? piece.href === video?.href : !piece.text.trim()));
  return { pieces, video, linkOnly };
}

/**
 * The player for an address that names its post: Instagram's embed page
 * for a post, reel or video, TikTok's Embed Player for a video. A TikTok
 * photo post, a short link, a profile, a story or another site has none
 * (the player answered "Video currently unavailable" for a public photo
 * post, and TikTok's oEmbed refuses one; checked 25 Nov 2026).
 *
 * Inputs: url — any parsed address (a friend's, or a short link's target).
 * Output: the player's https address, or null.
 * Examples (tests in players.test.ts):
 *   instagram.com/<user>/reel/C6HpUPegvtc → "https://www.instagram.com/reel/C6HpUPegvtc/embed/"
 *   instagram.com/p/CgVLB1Dj3Ow           → "https://www.instagram.com/p/CgVLB1Dj3Ow/embed/"
 *   tiktok.com/@/video/7620909821147073813?_r=1 → "https://www.tiktok.com/player/v1/7620909821147073813"
 *   tiktok.com/@charles.tibedo/photo/7647159449706040606 → null
 *   instagram.com/stories/savaya/1234567890 → null; instagram.com/share/reel/BBumGiQdP6 → null (a share link)
 */
export function playerOf(url: URL): string | null {
  const parts = url.pathname.split("/").filter(Boolean);
  if (INSTAGRAM.test(url.hostname)) {
    // /p/<code>, /reel/<code>, /reels/<code>, /tv/<code>, with an optional user name before it; /share/reel/<token> is a share link.
    if (parts[0] === "share") return null;
    const at = parts.findIndex((part, index) => index <= 1 && /^(p|reels?|tv)$/.test(part));
    const code = at >= 0 ? parts[at + 1] : undefined;
    if (!code || !/^[A-Za-z0-9_-]{5,40}$/.test(code)) return null;
    return `https://www.instagram.com/${parts[at] === "p" ? "p" : "reel"}/${code}/embed/`;
  }
  if (TIKTOK.test(url.hostname) && !/^(vm|vt)\./.test(url.hostname)) {
    // /@<user>/video/<id>; a short link's target has an empty user ("/@/video/<id>").
    const [user, kind, id] = parts;
    if (!user?.startsWith("@") || kind !== "video" || !/^\d{8,25}$/.test(id ?? "")) return null;
    return `https://www.tiktok.com/player/v1/${id}`;
  }
  return null;
}

/**
 * Whether an address is a short or share link: one that points to a post
 * whose id it does not hold, so the link reader must be asked where it goes.
 * Inputs: url — a parsed Instagram or TikTok address.
 * Output: true for vm.tiktok.com/<code>, vt.tiktok.com/<code>, tiktok.com/t/<code>, instagram.com/share/…
 * Examples (tests in players.test.ts): https://vt.tiktok.com/ZS9bVfWa6/ → true; https://www.tiktok.com/@savaya → false
 */
export function isShortLink(url: URL): boolean {
  const parts = url.pathname.split("/").filter(Boolean);
  if (/^(vm|vt)\.tiktok\.com$/.test(url.hostname)) return parts.length === 1;
  if (TIKTOK.test(url.hostname)) return parts[0] === "t" && parts.length === 2;
  if (INSTAGRAM.test(url.hostname)) return parts[0] === "share" && parts.length >= 2 && parts.length <= 3;
  return false;
}

function parse(href: string): URL | null {
  try {
    return new URL(href);
  } catch {
    return null;
  }
}

function siteOf(url: URL): VideoSite | null {
  if (INSTAGRAM.test(url.hostname)) return "instagram";
  if (TIKTOK.test(url.hostname)) return "tiktok";
  return null;
}

/** The link's words: the address without "https://", "www." or the query, at most 32 characters. */
function labelOf(url: URL): string {
  const label = `${url.hostname.replace(/^(www|m)\./, "")}${url.pathname.replace(/\/$/, "")}`;
  return label.length > 32 ? `${label.slice(0, 31)}…` : label;
}
