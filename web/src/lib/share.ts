import { useEffect, useRef } from "react";

/**
 * Says whether this browser has a share sheet: phones, and Safari and
 * Chrome on a Mac. Read once per draw; it never changes during a visit.
 *
 * Inputs: none.
 * Output: true where navigator.share exists.
 * Examples (checked on screen): an iPhone → true; Firefox on a desktop → false
 */
export function canShare(): boolean {
  return typeof navigator.share === "function";
}

/**
 * Opens the share sheet with a link. A sheet the friend closes, or a
 * browser that refuses, ends quietly: there is nothing to say about it.
 *
 * Only the link is sent. The name goes as the sheet's title, never as text:
 * a desktop share sheet's "Copy" joined text and link into one string, and
 * the words then became part of the address (owner, 25 Nov 2026: the shared
 * events link opened "…/events Bali · Koh Phangan").
 *
 * Inputs: url — the link to hand out; text — the sheet's title, where it shows one.
 * Output: true when the friend sent it somewhere, false when the sheet was
 * closed or refused.
 * Examples (checked on screen): Share → the phone's share sheet; Cancel → false, nothing shown
 */
export async function shareLink(url: string, text: string): Promise<boolean> {
  try {
    await navigator.share({ title: text, url });
    return true;
  } catch {
    return false;
  }
}

/**
 * Puts a link on the clipboard.
 *
 * Inputs: link — the text to copy.
 * Output: true when it was copied; false when the clipboard refused (an
 * old browser, a page not on https, a denied permission), so the caller
 * can offer the link to copy by hand.
 * Examples (checked on screen): "Copy link" on localhost → true; on http from another host → false
 */
export async function copyLink(link: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ends a 2-second confirmation ("Copied", "Saved"): while on is true, calls
 * off after 2 seconds; a new on restarts the wait.
 * Inputs: on, off. Output: nothing.
 * Examples (checked on screen): "Copy link" → "Copied" → "Copy link" 2 seconds later
 */
export function useFlash(on: boolean, off: () => void): void {
  const latest = useRef(off);
  latest.current = off;
  useEffect(() => {
    if (!on) return;
    const timer = setTimeout(() => latest.current(), 2000);
    return () => clearTimeout(timer);
  }, [on]);
}

/**
 * Makes the address of the shared events pages (owner, 25 Nov 2026: "share
 * the events stand alone", "and a single event"): every event of the trip,
 * or one event. The id is encoded, so an odd character can never change
 * the path; app/lib/route.ts reads it back.
 *
 * Inputs: origin — the site, such as window.location.origin; tripId; showId — one event, or none for all.
 * Output: "<origin>/trip/<tripId>/events", or ".../events/<showId>".
 * Examples (each is a test in share.test.ts):
 *   eventsLink("https://travel-ca8f9.web.app", "abc")             → "https://travel-ca8f9.web.app/trip/abc/events"
 *   eventsLink("http://localhost:5192", "abc", "bali_2027-02-13_savaya_peggy-gou") → "http://localhost:5192/trip/abc/events/bali_2027-02-13_savaya_peggy-gou"
 *   eventsLink("https://x.app", "abc", "a b/c")                    → "https://x.app/trip/abc/events/a%20b%2Fc"
 */
export function eventsLink(origin: string, tripId: string, showId?: string): string {
  const all = `${origin}/trip/${encodeURIComponent(tripId)}/events`;
  return showId === undefined ? all : `${all}/${encodeURIComponent(showId)}`;
}
