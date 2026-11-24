// The link reader: an AWS Lambda behind a function URL. Given a pasted
// Airbnb, Booking.com, Instagram or TikTok address, it fetches the page and
// returns what the app shows for it. It holds no secret, stores nothing and
// never retries; the app retries (plan section 5.4).

import { siteOf } from "./sites.mjs";
import { parseListing, parsePost } from "./parse.mjs";

const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const DEADLINE_MS = 6000;
const ORIGINS = /^(https:\/\/travel-ca8f9\.web\.app|http:\/\/localhost(:\d{1,5})?)$/;
// The sites answer a browser; a bare client gets a different page or none.
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

/**
 * Answers GET ?url=<address> with what the page says, for the Add a place
 * sheet (a listing) and the Add a link sheet (a post).
 *
 * Inputs: event, a Lambda function URL event. Its query holds url; its Origin
 *   header, when present, must be the app's site or http://localhost.
 *
 * Output: an HTTP response. Status 200 with JSON for every read that ran:
 *   { ok: true, name, photoUrl?, area?, sleeps? }   an Airbnb or Booking.com listing
 *   { ok: true, title, photoUrl? }                  an Instagram or TikTok post
 *   { ok: false, reason }   reason is "not_allowed" (not https, a host off the
 *     list, a redirect off the list or past three, or a call from another
 *     site; nothing is fetched for the first and last), "unreadable" (no
 *     title, a challenge page, an error status, a broken connection),
 *     "timeout" (no answer in 6 seconds) or "too_large" (512 KB read and
 *     still nothing to show). Status 204 for a CORS preflight, 405 for any
 *     other method.
 *
 * Examples (checked on the deployed function; see README.md):
 *   GET ?url=https://www.airbnb.com/rooms/1041153373514809459
 *     → 200 { ok: true, name: "Las Palmas Uluwatu", area: "South Kuta", sleeps: 2, photoUrl: "https://a0.muscache.com/…" }
 *   GET ?url=https://example.com → 200 { ok: false, reason: "not_allowed" }
 *   GET ?url=https://www.booking.com/hotel/th/x.html → 200 { ok: false, reason: "unreadable" }  (challenge page)
 */
export async function handler(event) {
  const method = event.requestContext?.http?.method ?? "GET";
  const origin = event.headers?.origin;
  const cors = origin && ORIGINS.test(origin) ? { "access-control-allow-origin": origin } : {};
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: { ...cors, "access-control-allow-methods": "GET", "access-control-max-age": "86400", vary: "Origin" } };
  }
  if (method !== "GET") return { statusCode: 405, headers: cors, body: "" };

  const answer = origin && !ORIGINS.test(origin) ? refuse("not_allowed") : await read(event.queryStringParameters?.url ?? "");
  console.log(JSON.stringify({ host: hostOf(event.queryStringParameters?.url), ok: answer.ok, reason: answer.reason }));
  return {
    statusCode: 200,
    headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store", vary: "Origin" },
    body: JSON.stringify(answer),
  };
}

// Fetches the address, following up to three redirects that stay on the same
// site, and parses the first 512 KB. Every failure becomes a reason.
async function read(address) {
  const first = siteOf(address);
  if (!first) return refuse("not_allowed");
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
      if (!next || hop === MAX_REDIRECTS || siteOf(next)?.site !== first.site) return refuse("not_allowed");
      url = next;
    }
    if (!response.ok) {
      await response.body?.cancel();
      return refuse("unreadable");
    }
    const { text, cut } = await firstBytes(response, MAX_BYTES);
    const found = first.kind === "listing" ? parseListing(text, url) : parsePost(text, url);
    if (found) return { ok: true, ...found };
    return refuse(cut ? "too_large" : "unreadable");
  } catch {
    return refuse(abort.signal.aborted ? "timeout" : "unreadable");
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

function refuse(reason) {
  return { ok: false, reason };
}

function hostOf(address) {
  try {
    return new URL(address).hostname;
  } catch {
    return null;
  }
}
