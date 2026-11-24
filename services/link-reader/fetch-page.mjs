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
