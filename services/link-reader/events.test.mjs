// The header examples of readEvents and onSourceSite, and checkEvents run
// offline: the pages are saved in fixtures/, and fetch is replaced.
// Run: node --test services/link-reader/*.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkEvents, readEvents } from "./events.mjs";
import { SOURCES, actBeforeBar, onSourceSite } from "./event-sources.mjs";

const page = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const savaya = SOURCES.find((source) => source.venue === "Savaya");
const clubSeen = SOURCES.find((source) => source.venue === "CLUB SEEN");

test("readEvents reads the Event on a saved Savaya night", () => {
  assert.deepEqual(readEvents(page("savaya-event.html")), [{ name: "PEGGY GOU", date: "2027-02-13" }]);
});

test("readEvents reads the coming nights on saved Illuzion Phuket and Zouk lists", () => {
  const illuzion = readEvents(page("illuzion-events.html"));
  assert.equal(illuzion.length, 7);
  assert.deepEqual(illuzion[0], { name: "TIMMY TRUMPET", date: "2026-11-27" });
  const zouk = readEvents(page("zouk-events.html"));
  assert.equal(zouk.length, 10);
  assert.deepEqual(zouk[0], { name: "TGIW", date: "2026-11-25" });
});

test("readEvents reads CLUB SEEN's list of coming nights, entities decoded", () => {
  const nights = readEvents(page("club-seen-events.html"));
  assert.equal(nights.length, 30);
  assert.deepEqual(nights[0], { name: "HERS | LADIES’ DAY", date: "2026-11-24" });
  assert.deepEqual(nights[29], { name: "O BEACH IBIZA", date: "2027-02-14" });
});

test("actBeforeBar keeps the act before the club's subtitle", () => {
  assert.equal(actBeforeBar("MAHMUT ORHAN | SEASON OPENING 2026"), "MAHMUT ORHAN");
  assert.equal(actBeforeBar("AFRODISE"), "AFRODISE");
  assert.equal(actBeforeBar("| NEW YEAR’S EVE"), "| NEW YEAR’S EVE");
});

test("readEvents finds nothing on Savaya's calendar, which only links to the nights", () => {
  assert.deepEqual(readEvents(page("savaya-calendar.html")), []);
});

test("readEvents reads a kind of Event inside a graph, decodes its name and skips one with no date", () => {
  const html =
    '<script type="application/ld+json">{"@graph":[{"@type":"MusicEvent","name":"Fisher &amp; Friends","startDate":"2027-03-13T22:00:00+08:00"},{"@type":"Event","name":"No date"}]}</script>';
  assert.deepEqual(readEvents(html), [{ name: "Fisher & Friends", date: "2027-03-13" }]);
});

test("onSourceSite opens the source's own host over https and nothing else", () => {
  assert.equal(onSourceSite(savaya, "https://www.savaya.com/event-calendar/february-13-2027"), true);
  assert.equal(onSourceSite(savaya, "http://www.savaya.com/event-calendar"), false);
  assert.equal(onSourceSite(savaya, "https://whatsform.com/ek7dt5"), false);
});

test("checkEvents keeps acts in the window (from 25 Jan), leaves out series and placeholders, and survives a source that is down", async (t) => {
  const night = (name, date) => `<script type="application/ld+json">{"@type":"Event","name":"${name}","startDate":"${date}"}</script>`;
  const pages = {
    "https://www.savaya.com/event-calendar": page("savaya-calendar.html"),
    "https://www.savaya.com/event-calendar/january-31-2027": night("ZAMNA", "Jan 31, 2027"),
    "https://www.savaya.com/event-calendar/february-13-2027": page("savaya-event.html"),
    "https://www.savaya.com/event-calendar/february-2-2027": night("SAVAYA TUESDAY", "Feb 02, 2027"),
    "https://www.savaya.com/event-calendar/february-9-2027": night("SAVAYA TUESDAY", "Feb 09, 2027"),
    "https://www.savaya.com/event-calendar/february-16-2027": night("SAVAYA TUESDAY", "Feb 16, 2027"),
    "https://www.savaya.com/event-calendar/february-6-2027": night("SPECIAL GUEST", "Feb 06, 2027"),
  };
  const opened = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    opened.push(url);
    if (!(url in pages)) throw new TypeError("fetch failed");
    return new Response(pages[url], { status: 200 });
  });
  const down = { venue: "Down Club", destination: "bali", area: "Canggu", url: "https://down.example/events" };

  const answer = await checkEvents([savaya, down]);

  assert.deepEqual(answer.events, [
    { destination: "bali", venue: "Savaya", area: "Uluwatu", date: "2027-01-31", artist: "ZAMNA", link: "https://www.savaya.com/event-calendar/january-31-2027" },
    { destination: "bali", venue: "Savaya", area: "Uluwatu", date: "2027-02-13", artist: "PEGGY GOU", link: "https://www.savaya.com/event-calendar/february-13-2027" },
  ]);
  assert.deepEqual(answer.failed, [{ venue: "Down Club", reason: "unreadable" }]);
  assert.ok(!opened.some((url) => url.includes("whatsform")), "opens no other host");
});

test("checkEvents reads CLUB SEEN: the weekly O BEACH IBIZA is a series, and an act loses its subtitle", async (t) => {
  const extra = '<script type="application/ld+json">{"@type":"Event","name":"MAHMUT ORHAN | SEASON CLOSING 2027","startDate":"2027-02-26T14:00:00+07:00"}</script>';
  t.mock.method(globalThis, "fetch", async (url) =>
    url === "https://www.seenbeachclubsamui.com/events/" ? new Response(page("club-seen-events.html") + extra, { status: 200 }) : new Response("", { status: 404 }),
  );

  const answer = await checkEvents([clubSeen]);

  assert.deepEqual(answer.events, [
    { destination: "kohSamui", venue: "CLUB SEEN", area: "Chaweng", date: "2027-02-26", artist: "MAHMUT ORHAN", link: "https://www.seenbeachclubsamui.com/events/" },
  ]);
  assert.deepEqual(answer.failed, []);
});

test("checkEvents reports CLUB SEEN as unreadable when its page refuses the request", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("Method Not Allowed", { status: 405 }));
  const answer = await checkEvents([clubSeen]);
  assert.deepEqual(answer, { ...answer, events: [], failed: [{ venue: "CLUB SEEN", reason: "unreadable" }] });
});
