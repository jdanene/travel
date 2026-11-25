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
 * Inputs: url — the link to hand out; text — the line the sheet carries.
 * Output: true when the friend sent it somewhere, false when the sheet was
 * closed or refused.
 * Examples (checked on screen): Share → the phone's share sheet; Cancel → false, nothing shown
 */
export async function shareLink(url: string, text: string): Promise<boolean> {
  try {
    await navigator.share({ text, url });
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
