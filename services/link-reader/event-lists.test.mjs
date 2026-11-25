// The header examples of the list readers in event-lists.mjs, each against
// its club's page as saved on 23 Nov 2026. None lists February or March 2027
// yet, so each test checks what the page holds now.
// Run: node --test services/link-reader/*.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as lists from "./event-lists.mjs";

const page = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const now = Date.UTC(2026, 10, 23, 12);
// Count, first and last date, and one night the page holds.
const reads = (nights, count, from, to, one) => {
  const dates = nights.map((n) => n.date).sort();
  assert.deepEqual([nights.length, dates[0], dates.at(-1)], [count, from, to]);
  assert.ok(nights.some((n) => JSON.stringify(n) === JSON.stringify(one)), `has ${JSON.stringify(one)}`);
};

test("Café del Mar Phuket: 29 nights, the date read month first and checked day first", () => {
  reads(lists.readCafeDelMarPhuket(page("cafe-del-mar-phuket-events.html"), "https://phuket.cafedelmar.com/events"), 29, "2026-11-25", "2027-05-31",
    { name: "CARL COX B2B NIC FANCIULLI", date: "2027-01-03", link: "https://phuket.cafedelmar.com/events/carl-cox-jan2027" });
});

test("CÉ LA VI: the Club Lounge nights only, not the dinners", () => {
  reads(lists.readCeLaVi(page("ce-la-vi-home.html"), "https://sg.celavi.com/"), 3, "2026-11-28", "2026-12-31",
    { name: "CÉ LA VI Pres. Fabio Neural", date: "2026-11-28", link: "https://sg.celavi.com/events/ce-la-vi-pres-fabio-neural",
      image: "https://cdn.prod.website-files.com/698c1624c29ff5d3d3ca21d6/6ae85e966bf9155e11c415f7_Fabio%20Neural_28Nov%2726_Web.jpg" });
});

test("Klymax: this week's one night", () => {
  assert.deepEqual(lists.readKlymax(page("klymax-home.html")), [{ name: "Cloud of Kouros., Slip D., Pete Santos", date: "2026-11-27" }]);
});

test("Café del Mar Bali: the coming night and the past ones in the same shape", () => {
  reads(lists.readCafeDelMarBali(page("cafe-del-mar-bali-whats-on.html"), "https://www.cafedelmarbali.co.id/whats-on"), 18, "2023-05-01", "2026-12-31",
    { name: "NEW YEARS EVE 2026", date: "2026-12-31", image: "https://www.cafedelmarbali.co.id/reserve/assets/images/events/event_square_1792567873_6ad86a41d5753.jpg" });
});

test("Desa Kitsuné: the year comes from the weekday", () => {
  assert.deepEqual(lists.readDesaKitsune(page("desa-kitsune-events.html"), "https://desakitsune.com/events", now), [
    { name: "FRIENDSGIVING", date: "2026-11-26" },
    { name: "INA RÉ 2ND ANNIVERSARY", date: "2026-12-03" },
    { name: "ÂME DJ", date: "2026-12-31" },
  ]);
});

test("Full Moon Party: one row per party", () => {
  reads(lists.readFullMoonParty(page("full-moon-party-schedules.html")), 16, "2026-11-24", "2027-12-31", { name: "Full Moon Party", date: "2027-02-22" });
});

test("Potato Head and Marquee: the feeds their pages load", () => {
  assert.deepEqual(lists.readPotatoHead(page("potato-head-music.json"), "https://seminyak.potatohead.co/api/cached/experiences?type=Event&categories=music"), [
    { name: "Live at Klymax: OFFSCRIPT", date: "2026-12-11", link: "https://seminyak.potatohead.co/experience/live-at-klymax-offscript",
      image: "https://cdn.potatohead.co/139_KLYMAX_OFFSCRIPT_LIVE_AT_KLYMAX_AUG_2026_1920x1080_WEB_4_dd0f32d092.jpg" },
    { name: "NYE 2026", date: "2026-12-31", link: "https://seminyak.potatohead.co/experience/new-years-eve",
      image: "https://cdn.potatohead.co/New_Year_Eve_NYE_2026_Potato_Head_16x9_65b55abc14.jpg" },
  ]);
  reads(lists.readMarquee(page("marquee-events.json"), "https://taogroup.com/wp-json/wp/v2/events"), 11, "2026-11-27", "2026-12-31",
    { name: "HOLY PRIEST", date: "2026-11-27", link: "https://taogroup.com/event/27-11-26-holy-priest-marquee-singapore/" });
  assert.deepEqual(lists.readMarquee("[]"), []);
  assert.equal(lists.readMarquee("<html>"), null);
});
