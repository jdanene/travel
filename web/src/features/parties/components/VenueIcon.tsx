import { useState, type ReactNode } from "react";

/**
 * A venue's picture as its icon (owner, 24 Nov 2026: "search for a good
 * looking picture of it… have that as venue icon"): a small rounded square
 * of a fixed size, so nothing moves while it loads. It loads lazily and
 * sends no referrer, so the trip's address never reaches the venue's site.
 * With no picture, or one that does not load, it draws the fallback
 * instead: nothing in the list's venue heading, as before; an icon tile in
 * the search's suggestions.
 *
 * Inputs: url — the venue's photoUrl (https only; anything else counts as
 * none); fallback — what to draw without a picture.
 * Output: the picture or the fallback. Decorative: the venue's name is beside it.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   Savaya with its photoUrl          → its picture, 2.5 rem square
 *   Eden Garden with none             → the fallback
 *   a picture that answers 404        → the fallback, after the error
 */
export function VenueIcon({ url, fallback = null }: { url?: string; fallback?: ReactNode }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!url || !url.startsWith("https://") || failed === url) return <>{fallback}</>;
  return <img className="venue-icon" src={url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(url)} />;
}
