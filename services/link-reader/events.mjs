// The events check: reads the clubs' own event pages (event-sources.mjs)
// and returns the events dated inside the events window. It reads a page's
// schema.org Event data, and, for a club that lists its nights as text or in
// a feed, that club's reader (event-lists.mjs). It calls no AI model. It
// stores nothing: the app writes what it returns (the function has no
// database access).

import { fetchPage } from "./fetch-page.mjs";
import { SOURCES, onSourceSite } from "./event-sources.mjs";
import { clean, dayOf, decodeEntities } from "./parse.mjs";

/** The events window, 25 Jan to 31 Mar 2027; database.rules.json allows show dates in it and no others
 * (web/src/features/parties/lib/window.ts holds the same days). */
const SEASON = { from: "2027-01-25", to: "2027-03-31" };
const MAX_EVENTS = 100;
/** Pages fetched at the same time, across all sources. */
const AT_ONCE = 6;
/** One page a night for the window (66 nights); a club with more pages is cut here. */
const MAX_PAGES_PER_SOURCE = 66;
/** No new page is opened after this; each open page has its own 6 seconds. */
const START_PAGES_FOR_MS = 10_000;
/** A name a club gives a night before it names the act. */
const PLACEHOLDER = /^(?:(?:special|secret|mystery|surprise) guests?|tba|tbc|to be (?:announced|confirmed))$/i;
/** A name on this many nights of one club in the season is a series (a house night, a sunset session), not an act. */
const SERIES_NIGHTS = 3;


/**
 * Checks every source once and returns the acts it announces from 25 January
 * to 31 March 2027, so the app can add the ones it does not list yet. A
 * source that fails does not stop the others.
 *
 * Inputs: sources, the clubs to read (SOURCES unless a test passes its own).
 *
 * Output: { ok: true, checkedAt, events, failed }.
 *   checkedAt  when the check ran, in milliseconds since 1970.
 *   events     at most 100, by date: { destination, venue, area, date,
 *              artist, link }, where date is "YYYY-MM-DD" inside the season,
 *              artist is the club's name for the night, and link is the
 *              https page the event came from. A night named "Special
 *              guest" or "TBA", or a name the club gives three or more
 *              nights in the season, is left out: it is not an act.
 *   failed     [{ venue, reason }], one entry per source that failed, with
 *              the reader's reasons ("not_allowed", "unreadable",
 *              "timeout"). "unreadable" also means the page lists no event
 *              and links to none, or its list reader does not recognise it
 *              (event-lists.mjs); a feed that lists nothing is no failure. Events read before a failure are kept.
 *
 * Examples (run from a Mac against the live pages on 23 Nov 2026; the
 * offline version is a test in events.test.mjs):
 *   checkEvents() → { ok: true, failed: [], events: [PEGGY GOU 13 Feb, BABY J 14 Feb,
 *     FRANKY RIZARDO 20 Feb, ANTS 27 Feb, BEN BÖHMER 28 Feb, all at Savaya] }
 *     (its 26 other nights in the season are house nights and "Special guest")
 *   checkEvents() with Savaya down → { ok: true, events: [], failed: [{ venue: "Savaya", reason: "unreadable" }] }
 */
export async function checkEvents(sources = SOURCES) {
  const checkedAt = Date.now();
  const stopAt = checkedAt + START_PAGES_FOR_MS;
  const found = [];
  const failed = new Map();
  const fail = (source, reason) => failed.has(source) || failed.set(source, reason);

  const open = (source, url) =>
    Date.now() > stopAt ? { ok: false, reason: "timeout" } : fetchPage(url, (next) => onSourceSite(source, next));

  // First the sources' own pages, then the event pages they link to.
  const pages = [];
  await eachAtMost(AT_ONCE, sources, async (source) => {
    const page = await open(source, source.url);
    if (!page.ok) return fail(source, page.reason);
    const listed = source.list ? source.list(page.text, page.url, checkedAt) : null;
    const events = [...readEvents(page.text), ...(listed ?? [])];
    const links = eventLinks(page.text, page.url, source);
    if (!events.length && !links.length && !listed) return fail(source, "unreadable");
    found.push(...events.map((event) => ({ source, event, link: event.link ?? page.url })));
    for (const link of links.filter((url) => inSeason(dayOf(new URL(url).pathname) ?? SEASON.from)).slice(0, MAX_PAGES_PER_SOURCE)) {
      pages.push({ source, link });
    }
  });
  await eachAtMost(AT_ONCE, pages, async ({ source, link }) => {
    const page = await open(source, link);
    if (!page.ok) return fail(source, page.reason);
    found.push(...readEvents(page.text).map((event) => ({ source, event, link: page.url })));
  });

  return {
    ok: true,
    checkedAt,
    events: actsInSeason(found).slice(0, MAX_EVENTS),
    failed: [...failed].map(([source, reason]) => ({ venue: source.venue, reason })),
  };
}

/**
 * Reads the events a page publishes as schema.org data (JSON-LD), the form
 * search engines read, so no club's layout has to be known.
 *
 * Inputs: html, the page as fetched.
 *
 * Output: [{ name, date }] for each Event (or a kind of Event, such as
 *   MusicEvent or Festival) that has a name and a start date, in page
 *   order. date is "YYYY-MM-DD" as the club writes it, before any time of
 *   day. A block that is not JSON, and an event without a name or a
 *   readable date, are skipped. A page without such data gives [].
 *
 * Examples (the saved pages are in fixtures/; events.test.mjs runs each):
 *   readEvents(<fixtures/savaya-event.html>)    → [{ name: "PEGGY GOU", date: "2027-02-13" }]
 *   readEvents(<fixtures/illuzion-events.html>) → [{ name: "TIMMY TRUMPET", date: "2026-11-27" }, … 7 nights to 21 Dec]
 *   readEvents(<fixtures/zouk-events.html>)     → [{ name: "TGIW", date: "2026-11-25" }, … 10 nights to 2 Dec]
 *   readEvents(<fixtures/savaya-calendar.html>) → []   (the calendar only links to the nights)
 *   readEvents('<script type="application/ld+json">{"@graph":[{"@type":"MusicEvent","name":"Fisher &amp; Friends","startDate":"2027-03-13T22:00:00+08:00"},{"@type":"Event","name":"No date"}]}</script>')
 *     → [{ name: "Fisher & Friends", date: "2027-03-13" }]
 */
export function readEvents(html) {
  const events = [];
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    const types = [].concat(node["@type"] ?? []);
    if (types.some((type) => typeof type === "string" && /(?:Event|^Festival)$/.test(type))) {
      const name = typeof node.name === "string" ? clean(decodeEntities(node.name)) : undefined;
      const date = typeof node.startDate === "string" ? dayOf(node.startDate) : null;
      if (name && date) events.push({ name, date });
    }
    for (const value of Object.values(node)) if (value && typeof value === "object") visit(value);
  };
  for (const [, body] of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(body));
    } catch {
      // A broken block says nothing; the other blocks still count.
    }
  }
  return events;
}

// The links on a source's page to its one-event pages: on its own host,
// asked for over https, each once.
function eventLinks(html, pageUrl, source) {
  if (!source.eventPages) return [];
  const links = new Set();
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)["']/gi)) {
    let url;
    try {
      url = new URL(decodeEntities(href), pageUrl);
    } catch {
      continue;
    }
    if (url.protocol === "http:") url.protocol = "https:";
    url.search = "";
    if (onSourceSite(source, url.toString()) && source.eventPages.test(url.pathname)) links.add(url.toString());
  }
  return [...links];
}

// The found events as the app wants them: inside the season, acts only,
// each night once, by date.
function actsInSeason(found) {
  const nights = new Map();
  for (const { source, event } of found) {
    if (!inSeason(event.date)) continue;
    const key = `${source.venue}|${event.name.toLowerCase()}`;
    nights.set(key, (nights.get(key) ?? new Set()).add(event.date));
  }
  const seen = new Set();
  const acts = [];
  for (const { source, event, link } of found) {
    const key = `${source.venue}|${event.name.toLowerCase()}`;
    if (!inSeason(event.date) || PLACEHOLDER.test(event.name) || nights.get(key).size >= SERIES_NIGHTS) continue;
    if (seen.has(`${key}|${event.date}`)) continue;
    seen.add(`${key}|${event.date}`);
    const artist = event.name.length > 200 ? event.name.slice(0, 199) + "…" : event.name;
    acts.push({ destination: source.destination, venue: source.venue, area: source.area, date: event.date, artist, link });
  }
  return acts.sort((a, b) => a.date.localeCompare(b.date) || a.artist.localeCompare(b.artist));
}

function inSeason(day) {
  return day >= SEASON.from && day <= SEASON.to;
}

// Runs task over items with at most limit running at once.
async function eachAtMost(limit, items, task) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await task(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
