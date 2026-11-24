// The header examples of readEvents and onSourceSite, and checkEvents run
// offline: the pages are saved in fixtures/, and fetch is replaced.
// Run: node --test services/link-reader/*.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkEvents, readEvents } from "./events.mjs";
import { SOURCES, onSourceSite } from "./event-sources.mjs";

const page = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const savaya = SOURCES.find((source) => source.venue === "Savaya");

test("readEvents reads the Event on a saved Savaya night", () => {
  assert.deepEqual(readEvents(page("savaya-event.html")), [{ name: "PEGGY GOU", date: "2027-02-13" }]);
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

test("checkEvents keeps acts in the season, leaves out series and placeholders, and survives a source that is down", async (t) => {
  const night = (name, date) => `<script type="application/ld+json">{"@type":"Event","name":"${name}","startDate":"${date}"}</script>`;
  const pages = {
    "https://www.savaya.com/event-calendar": page("savaya-calendar.html"),
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
    { destination: "bali", venue: "Savaya", area: "Uluwatu", date: "2027-02-13", artist: "PEGGY GOU", link: "https://www.savaya.com/event-calendar/february-13-2027" },
  ]);
  assert.deepEqual(answer.failed, [{ venue: "Down Club", reason: "unreadable" }]);
  assert.ok(!opened.some((url) => url.includes("january-31") || url.includes("whatsform")), "opens no night outside the season and no other host");
});
