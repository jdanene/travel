// The header examples of blast.mjs: the request, who gets a text, the cap
// check, and one whole send against a fake database and a fake SMS client.
// Fictional numbers only. Run: node --test services/travel-texts/*.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { nextCount, readRequest, recipients, smsText, textCrew } from "./blast.mjs";

test("readRequest trims the message and refuses one over 300 characters", () => {
  assert.deepEqual(readRequest({ tripId: "t1", message: " Hi ", audience: "in" }), { ok: true, tripId: "t1", message: "Hi", audience: "in", memberIds: null });
  assert.deepEqual(readRequest({ tripId: "t1", message: "x".repeat(301), audience: "all" }), { ok: false });
});

test("smsText puts the trip's name in front and the short link at the end", () => {
  assert.equal(smsText("Bali · Koh Phangan", "Flights are booked!", "t1"), "Bali · Koh Phangan trip: Flights are booked! travel-ca8f9.web.app/trip/t1");
});

test("recipients picks by reply, and a re-send only the ids that have a number", () => {
  const phones = { rb: { e164: "+14155550101" }, lc: { e164: "+14155550102" } };
  assert.deepEqual(recipients("maybe", phones, { rb: { reply: "in" }, lc: { reply: "maybe" } }, null), ["lc"]);
  assert.deepEqual(recipients("all", phones, {}, ["lc", "zz"]), ["lc"]);
});

test("nextCount allows a fifth text in a day and refuses a sixth", () => {
  assert.deepEqual(nextCount(null), { ok: true, texts: 1 });
  assert.deepEqual(nextCount({ texts: 4 }), { ok: true, texts: 5 });
  assert.deepEqual(nextCount({ texts: 5 }), { ok: false });
});

/** A fake Realtime Database REST API over `data`; a write needs the ETag of the value it replaces. */
function fakeDatabase(data) {
  return async (url, init = {}) => {
    const path = new URL(url).pathname.replace(/^\//, "").replace(/\.json$/, "").split("/");
    const read = () => path.reduce((node, key) => node?.[key], data) ?? null;
    if (init.method === "PUT") {
      if (init.headers["if-match"] !== JSON.stringify(read())) return new Response("", { status: 412 });
      const parent = path.slice(0, -1).reduce((node, key) => (node[key] ??= {}), data);
      parent[path.at(-1)] = JSON.parse(init.body);
      return new Response(init.body);
    }
    return new Response(JSON.stringify(read()), { headers: { etag: JSON.stringify(read()) } });
  };
}

const run = (data, uid, send) =>
  textCrew(
    { token: "tok", body: { tripId: "t1", message: "Flights are booked!", audience: "all" } },
    { verify: async () => ({ ok: true, uid }), fetchFn: fakeDatabase(data), send, now: () => Date.UTC(2027, 1, 1, 12) },
  );
const trip = (textLog) => ({
  trips: { t1: { info: { name: "Bali · Koh Phangan" }, crew: { organizers: { "uid-o": true }, members: { rb: { reply: "in" }, lc: { reply: "maybe" } } } } },
  tripSecrets: { t1: { phones: { rb: { e164: "+14155550101" }, lc: { e164: "+14155550102" } }, textLog } },
});

test("textCrew sends to each number, reports each result and counts the send", async () => {
  const data = trip({});
  const sent = [];
  const send = async (e164, text) => {
    sent.push(text);
    return e164.endsWith("0102") ? { status: "sent" } : { status: "refused", reason: "DESTINATION_PHONE_NUMBER_OPTED_OUT" };
  };
  const answer = await run(data, "uid-o", send);
  assert.equal(answer.status, 200);
  assert.deepEqual(answer.body.results, [
    { memberId: "lc", status: "sent" },
    { memberId: "rb", status: "refused", reason: "DESTINATION_PHONE_NUMBER_OPTED_OUT" },
  ]);
  assert.equal(answer.body.textsToday, 1);
  assert.equal(data.tripSecrets.t1.textLog["2027-02-01"].texts, 1);
  assert.equal(sent[0], "Bali · Koh Phangan trip: Flights are booked! travel-ca8f9.web.app/trip/t1");
});

test("textCrew sends nothing for a friend, or after five sends today", async () => {
  const send = async () => assert.fail("nothing may be sent");
  assert.deepEqual((await run(trip({}), "uid-a", send)).body, { ok: false, sent: false, reason: "not_organizer" });
  const capped = await run(trip({ "2027-02-01": { texts: 5, at: 1 } }), "uid-o", send);
  assert.deepEqual([capped.status, capped.body.reason], [429, "daily_cap"]);
});
