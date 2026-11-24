// The link reader: an AWS Lambda behind a function URL. Given a pasted
// Airbnb, Booking.com, Instagram or TikTok address, it fetches the page and
// returns what the app shows for it. Asked to check for events, it reads the
// clubs' own event pages (events.mjs). It holds no secret, stores nothing
// and never retries; the app retries a read (plan section 5.4).

import { siteOf } from "./sites.mjs";
import { parseListing, parsePost } from "./parse.mjs";
import { fetchPage } from "./fetch-page.mjs";
import { checkEvents } from "./events.mjs";

const ORIGINS = /^(https:\/\/travel-ca8f9\.web\.app|http:\/\/localhost(:\d{1,5})?)$/;

/**
 * Answers GET ?url=<address> with what the page says, for the Add a place
 * sheet (a listing) and the Add a link sheet (a post), and GET ?check=events
 * with the clubs' events from 25 January to 31 March 2027, for the app's events
 * check.
 *
 * Inputs: event, a Lambda function URL event. Its query holds url, or check
 *   set to "events"; its Origin header, when present, must be the app's site
 *   or http://localhost.
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
 *   GET ?check=events → 200 { ok: true, checkedAt: 1795400000000, events: [{ destination: "bali", venue: "Savaya", … }], failed: [] }
 *     (run locally against the live club pages; not yet deployed)
 */
export async function handler(event) {
  const method = event.requestContext?.http?.method ?? "GET";
  const origin = event.headers?.origin;
  const cors = origin && ORIGINS.test(origin) ? { "access-control-allow-origin": origin } : {};
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: { ...cors, "access-control-allow-methods": "GET", "access-control-max-age": "86400", vary: "Origin" } };
  }
  if (method !== "GET") return { statusCode: 405, headers: cors, body: "" };

  const query = event.queryStringParameters ?? {};
  const answer = origin && !ORIGINS.test(origin) ? refuse("not_allowed") : query.check === "events" ? await checkOnce() : await read(query.url ?? "");
  console.log(
    JSON.stringify(
      query.check === "events"
        ? { check: "events", ok: answer.ok, events: answer.events?.length, failed: answer.failed }
        : { host: hostOf(query.url), ok: answer.ok, reason: answer.reason },
    ),
  );
  return {
    statusCode: 200,
    headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store", vary: "Origin" },
    body: JSON.stringify(answer),
  };
}

// Reads a pasted address on one of the allowed sites; every redirect must
// stay on that site. Every failure becomes a reason.
async function read(address) {
  const first = siteOf(address);
  if (!first) return refuse("not_allowed");
  const page = await fetchPage(address, (next) => siteOf(next)?.site === first.site);
  if (!page.ok) return refuse(page.reason);
  const found = first.kind === "listing" ? parseListing(page.text, page.url) : parsePost(page.text, page.url);
  if (found) return { ok: true, ...found };
  return refuse(page.cut ? "too_large" : "unreadable");
}

// One check of the clubs serves every call for 10 minutes, so a burst of
// calls to the public address never becomes a burst of requests to the clubs.
const CHECK_REUSE_MS = 10 * 60 * 1000;
let lastCheck = null;

async function checkOnce() {
  if (lastCheck && Date.now() - lastCheck.checkedAt < CHECK_REUSE_MS) return lastCheck;
  const answer = await checkEvents();
  lastCheck = answer;
  return answer;
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
