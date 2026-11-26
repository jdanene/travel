// The one way the link reader opens a page: https only, a fixed browser
// user agent, at most three redirects that each stay where the caller
// allows, 6 seconds and 512 KB. The pasted-link read and the events check
// both use it. It never retries.

const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const DEADLINE_MS = 6000;
// The sites answer a browser; a bare client gets a different page or none.
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

/**
 * Fetches one page within the reader's limits, so no caller can open more
 * than it means to.
 *
 * Inputs:
 *   address, an absolute https address the caller has already allowed.
 *   allows(next), says whether a redirect's target may be opened; every
 *     hop is asked, and a "no" ends the fetch.
 *
 * Output: { ok: true, text, url, cut } with the first 512 KB of the body as
 *   text, the address after redirects, and cut true when the body was
 *   longer. { ok: false, reason } otherwise: "not_allowed" (a redirect the
 *   caller refuses, or a fourth one), "unreadable" (an error status or a
 *   broken connection), "timeout" (no full answer in 6 seconds).
 *
 * Examples (the redirect rule is a test in parse.test.mjs):
 *   fetchPage("https://www.airbnb.com/rooms/1", sameSite)  → { ok: true, text: "<!doctype html>…", url: "https://www.airbnb.com/rooms/1", cut: false }
 *   a redirect to https://evil.example/                     → { ok: false, reason: "not_allowed" }, the target never opened
 */
export async function fetchPage(address, allows) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), DEADLINE_MS);
  try {
    let url = address;
    let response;
    for (let hop = 0; ; hop++) {
      response = await fetch(url, {
        redirect: "manual",
        signal: abort.signal,
        headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml", "accept-language": "en-US,en;q=0.9" },
      });
      if (response.status < 300 || response.status >= 400) break;
      const next = response.headers.get("location") && new URL(response.headers.get("location"), url).toString();
      await response.body?.cancel();
      if (!next || hop === MAX_REDIRECTS || !allows(next)) return { ok: false, reason: "not_allowed" };
      url = next;
    }
    if (!response.ok) {
      await response.body?.cancel();
      return { ok: false, reason: "unreadable" };
    }
    const { text, cut } = await firstBytes(response, MAX_BYTES);
    return { ok: true, text, url, cut };
  } catch {
    return { ok: false, reason: abort.signal.aborted ? "timeout" : "unreadable" };
  } finally {
    clearTimeout(timer);
  }
}

// Instagram answers a share link's redirect only to a phone; a desktop
// browser gets an error page (checked 25 Nov 2026). TikTok answers both.
const PHONE_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

/**
 * Asks where a short or share link points, without opening the post: one
 * request as a phone's browser, no body read, 6 seconds. A short link's id
 * is not in its address, so the app asks this once per link and keeps it.
 *
 * Inputs: address, an absolute https address the caller has already allowed.
 *   allows(next), says whether the redirect's target is acceptable.
 *
 * Output: { ok: true, url } with the redirect's target, made absolute.
 *   { ok: false, reason } otherwise: "unreadable" (no redirect: an error
 *   page, a removed post, a broken connection), "not_allowed" (a target the
 *   caller refuses), "timeout".
 *
 * Examples (the rule is a test in parse.test.mjs; checked by hand 25 Nov 2026):
 *   https://vt.tiktok.com/ZS9bVfWa6/                → { ok: true, url: "https://www.tiktok.com/@/video/7620909821147073813?_r=1&…" }
 *   https://www.instagram.com/share/reel/BBumGiQdP6/ → { ok: true, url: "https://www.instagram.com/reel/C6HpUPegvtc/?igsh=…" }
 */
export async function redirectOf(address, allows) {
  try {
    const response = await fetch(address, {
      redirect: "manual",
      signal: AbortSignal.timeout(DEADLINE_MS),
      headers: { "user-agent": PHONE_AGENT, accept: "text/html,application/xhtml+xml", "accept-language": "en-US,en;q=0.9" },
    });
    await response.body?.cancel();
    const location = response.status >= 300 && response.status < 400 && response.headers.get("location");
    if (!location) return { ok: false, reason: "unreadable" };
    const next = new URL(location, address).toString();
    return allows(next) ? { ok: true, url: next } : { ok: false, reason: "not_allowed" };
  } catch (error) {
    return { ok: false, reason: error?.name === "TimeoutError" ? "timeout" : "unreadable" };
  }
}

// Reads at most limit bytes of the body and drops the rest.
async function firstBytes(response, limit) {
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  let cut = false;
  while (size < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  if (size >= limit) {
    cut = true;
    await reader.cancel();
  }
  const bytes = Buffer.concat(chunks).subarray(0, limit);
  return { text: bytes.toString("utf8"), cut };
}
