// The header examples of parseListing, parsePost and siteOf, and the redirect
// rule of the handler (plan, Trip 8, edge cases 1 and 2). No network: the
// pages are saved in fixtures/, and the redirect test replaces fetch.
// Run: node --test services/link-reader/parse.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseListing, parsePost } from "./parse.mjs";
import { siteOf } from "./sites.mjs";
import { handler } from "./handler.mjs";

const page = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

test("parseListing reads a saved Airbnb listing", () => {
  assert.deepEqual(parseListing(page("airbnb-listing.html"), "https://www.airbnb.com/rooms/1041153373514809459"), {
    name: "Las Palmas Uluwatu",
    area: "South Kuta",
    sleeps: 2,
    photoUrl:
      "https://a0.muscache.com/im/pictures/hosting/Hosting-1041153373514809459/original/49848837-19bf-461b-a986-d31aa73f021a.jpeg?im_w=720&width=720&quality=70&auto=webp",
  });
});

test("parseListing reads Booking.com's title shape and makes a protocol-relative photo https", () => {
  const html =
    '<title>Hotel</title><meta property="og:title" content="★★★★ Rin Bay View, Haad Rin, Thailand"><meta property="og:image" content="//cf.bstatic.com/x.jpg">';
  assert.deepEqual(parseListing(html, "https://www.booking.com/hotel/th/rin-bay-view.html"), {
    name: "Rin Bay View",
    area: "Haad Rin",
    photoUrl: "https://cf.bstatic.com/x.jpg",
  });
});

test("parseListing finds nothing on Booking.com's saved challenge page", () => {
  assert.equal(parseListing(page("booking-challenge.html"), "https://www.booking.com/hotel/th/x.html"), null);
});

test("parsePost reads a saved TikTok video from the page's JSON", () => {
  assert.deepEqual(parsePost(page("tiktok-video.html"), "https://www.tiktok.com/@x/video/7391831906586807598"), {
    title: "🎉 Full Moon Party in Thailand: What You Need to Know 🌕",
    photoUrl:
      "https://p19-common-sign.tiktokcdn-us.com/tos-useast5-p-0068-tx/6a2c3f515bef41f9891c690ab946f3f7_1721045007~tplv-tiktokx-origin.image?x-expires=1795662000",
  });
});

test("parsePost finds nothing on Instagram's saved login wall", () => {
  assert.equal(parsePost(page("instagram-login.html"), "https://www.instagram.com/savayabali/"), null);
});

test("parsePost decodes entities and asks for an http photo over https", () => {
  const html =
    '<meta content="Savaya on Instagram: &quot;Sunset&quot;" property="og:title"><meta property="og:image" content="http://cdn.example/p.jpg">';
  assert.deepEqual(parsePost(html, "https://www.instagram.com/p/abc/"), {
    title: 'Savaya on Instagram: "Sunset"',
    photoUrl: "https://cdn.example/p.jpg",
  });
});

test("siteOf allows the four sites over https only (edge case 1)", () => {
  assert.deepEqual(siteOf("https://www.airbnb.com/rooms/1041153373514809459"), { site: "airbnb", kind: "listing" });
  assert.deepEqual(siteOf("https://vm.tiktok.com/ZMabc123/"), { site: "tiktok", kind: "post" });
  assert.equal(siteOf("http://www.booking.com/hotel/th/x.html"), null);
  assert.equal(siteOf("https://www.airbnb.com.evil.example/rooms/1"), null);
  assert.equal(siteOf("https://www.booking.com@evil.example/"), null);
});

test("the handler refuses a redirect off the site and a fourth redirect (edge case 2)", async (t) => {
  const hops = [];
  const redirectTo = (location) => new Response(null, { status: 302, headers: { location } });
  t.mock.method(globalThis, "fetch", async (url) => {
    hops.push(url);
    if (url.includes("off")) return redirectTo("https://evil.example/");
    return redirectTo(`https://www.airbnb.com/rooms/${hops.length}`);
  });
  const ask = async (url) => JSON.parse((await handler({ queryStringParameters: { url } })).body);

  assert.deepEqual(await ask("https://www.airbnb.com/rooms/off"), { ok: false, reason: "not_allowed" });
  assert.deepEqual(hops, ["https://www.airbnb.com/rooms/off"]);

  hops.length = 0;
  assert.deepEqual(await ask("https://www.airbnb.com/rooms/0"), { ok: false, reason: "not_allowed" });
  assert.equal(hops.length, 4);
});

test("resolve answers a short link's target on the same site, with no page read", async (t) => {
  // Recorded 25 Nov 2026: what the short links answered a phone's browser.
  const recorded = {
    "https://vt.tiktok.com/ZS9bVfWa6/": "https://www.tiktok.com/@/video/7620909821147073813?_r=1",
    "https://www.instagram.com/share/reel/BBumGiQdP6/": "/reel/C6HpUPegvtc/?igsh=x",
    "https://vm.tiktok.com/off/": "https://evil.example/",
  };
  t.mock.method(globalThis, "fetch", async (url) =>
    recorded[url] ? new Response(null, { status: 302, headers: { location: recorded[url] } }) : new Response("<html>", { status: 200 }),
  );
  const ask = async (resolve) => JSON.parse((await handler({ queryStringParameters: { resolve } })).body);

  assert.deepEqual(await ask("https://vt.tiktok.com/ZS9bVfWa6/"), { ok: true, url: "https://www.tiktok.com/@/video/7620909821147073813?_r=1" });
  assert.deepEqual(await ask("https://www.instagram.com/share/reel/BBumGiQdP6/"), { ok: true, url: "https://www.instagram.com/reel/C6HpUPegvtc/?igsh=x" });
  assert.deepEqual(await ask("https://vm.tiktok.com/off/"), { ok: false, reason: "not_allowed" });
  assert.deepEqual(await ask("https://www.instagram.com/share/gone/"), { ok: false, reason: "unreadable" });
  assert.deepEqual(await ask("https://www.airbnb.com/rooms/1"), { ok: false, reason: "not_allowed" });
});
