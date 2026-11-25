/**
 * The rules of the events check, against the database emulator: a member
 * adds a show the check found, never over an existing one, and
 * parties/lastCheck only moves forward. Run with `npm run test:rules`.
 * It uses its own database (project demo-travel-events), so it runs beside
 * rules.test.ts without touching that file's data.
 */
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { ref, set } from "firebase/database";
import { afterAll, beforeAll, describe, it } from "vitest";
import * as paths from "../src/lib/paths";

const T = "t1";
let env: RulesTestEnvironment;

const db = (uid: string) => env.authenticatedContext(uid).database();
const found = { destination: "bali", venue: "Savaya", area: "Uluwatu", date: "2027-02-28", artist: "BEN BÖHMER", link: "https://www.savaya.com/event-calendar/february-28-2027", verified: true, source: "check", at: 1 };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-travel-events",
    database: { rules: readFileSync("../database.rules.json", "utf8"), host: "127.0.0.1", port: Number(process.env.RULES_DB_PORT ?? 9000) },
  });
  await env.withSecurityRulesDisabled((ctx) =>
    set(ref(ctx.database()), {
      trips: { [T]: {
        info: { name: "Bali · Koh Phangan", season: { from: "2027-02-01", to: "2027-03-31" }, destinations: { bali: { name: "Bali" } } },
        crew: { devices: { "uid-a": "alice" } },
        parties: { shows: { seed1: { destination: "bali", venue: "Savaya", date: "2027-02-13", artist: "Peggy Gou", verified: true, source: "seed", at: 1 } } },
      } },
    }),
  );
});

afterAll(() => env.cleanup());

describe("events check rules", () => {
  it("lets a member add a show the check found, confirmed and with an https link", async () => {
    await assertSucceeds(set(ref(db("uid-a"), paths.show(T, "c1")), found));
    await assertFails(set(ref(db("uid-a"), paths.show(T, "c2")), { ...found, verified: false }));
    await assertFails(set(ref(db("uid-a"), paths.show(T, "c3")), { ...found, link: "http://www.savaya.com/" }));
  });

  it("refuses a checked show over a show that exists", async () => {
    await assertFails(set(ref(db("uid-a"), paths.show(T, "seed1")), { ...found, date: "2027-02-13", artist: "PEGGY GOU" }));
  });

  it("lets lastCheck move forward only, and only under the writer's member", async () => {
    const now = Date.now();
    await assertSucceeds(set(ref(db("uid-a"), paths.lastCheck(T)), { at: now, by: "alice" }));
    await assertFails(set(ref(db("uid-a"), paths.lastCheck(T)), { at: now - 1000, by: "alice" }));
    await assertFails(set(ref(db("uid-a"), paths.lastCheck(T)), { at: now + 5 * 60_000, by: "alice" }));
    await assertFails(set(ref(db("uid-a"), paths.lastCheck(T)), { at: now + 1000, by: "bob" }));
  });
});
