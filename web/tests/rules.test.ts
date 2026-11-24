/**
 * The rules tests of Trip 2 and of Add dates, against the database emulator. Run with
 * `npm run test:rules` in web/; it starts the emulator, runs this file and
 * stops it. Each test names the rule it proves, in the words of plan
 * section 4.
 */
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { get, ref, remove, set, update } from "firebase/database";
import { afterAll, beforeAll, describe, it } from "vitest";
import * as paths from "../src/lib/paths";

const T = "t1";
const KEY = "Key0123456789abcdefXYZ";
let env: RulesTestEnvironment;

const db = (uid?: string) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).database();
const show = (extra: object) => ({ destination: "bali", venue: "Savaya", date: "2027-02-13", artist: "Peggy Gou", verified: true, at: 1, ...extra });

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-travel",
    database: { rules: readFileSync("../database.rules.json", "utf8"), host: "127.0.0.1", port: 9000 },
  });
  await env.withSecurityRulesDisabled((ctx) =>
    set(ref(ctx.database()), {
      trips: { [T]: {
        info: { name: "Bali · Koh Phangan", season: { from: "2027-02-01", to: "2027-03-31" }, destinations: { bali: { name: "Bali" } } },
        crew: { devices: { "uid-a": "alice", "uid-b": "bob", "uid-o": "olga", "uid-c": "carl" }, organizers: { "uid-o": true } },
        dates: { options: { o1: { from: "2027-02-13", to: "2027-02-23" } } },
        stay: { options: { s1: { destination: "bali", url: "https://www.airbnb.com/rooms/1", name: "Villa", area: "Uluwatu", addedBy: "bob", at: 1 } } },
        parties: { shows: { seed1: show({ source: "seed" }), f1: show({ source: "friend", addedBy: "alice", artist: "Friend set" }) } },
      } },
      tripSecrets: { [T]: { organizerKey: { [KEY]: true } } },
    }),
  );
});

afterAll(() => env.cleanup());

describe("database rules", () => {
  it("1. refuses a list of /trips", () => assertFails(get(ref(db("uid-a"), "trips"))));

  it("2. lets a signed-in device read one trip, and refuses a device that is not signed in", async () => {
    await assertSucceeds(get(ref(db("uid-a"), paths.trip(T))));
    await assertFails(get(ref(db(), paths.trip(T))));
  });

  it("3. lets a device write its own crew/devices entry and refuses another's", async () => {
    await assertSucceeds(set(ref(db("uid-n"), paths.device(T, "uid-n")), "nina"));
    await assertFails(set(ref(db("uid-n"), paths.device(T, "uid-a")), "nina"));
  });

  it("4. lets a device answer, heart, say in and reply under its member, and refuses under another", async () => {
    const a = db("uid-a");
    await assertSucceeds(set(ref(a, paths.answer(T, "o1", "alice")), "yes"));
    await assertSucceeds(set(ref(a, paths.heart(T, "s1", "alice")), true));
    await assertSucceeds(set(ref(a, paths.inMark(T, "seed1", "alice")), true));
    await assertSucceeds(set(ref(a, paths.member(T, "alice")), { name: "Alice", reply: "in", at: 1 }));
    await assertFails(set(ref(a, paths.answer(T, "o1", "bob")), "yes"));
    await assertFails(set(ref(a, paths.heart(T, "s1", "bob")), true));
    await assertFails(set(ref(a, paths.inMark(T, "seed1", "bob")), true));
    await assertFails(set(ref(a, paths.member(T, "bob")), { name: "Bob", reply: "in", at: 1 }));
  });

  it("5. refuses dates/confirmed and stay/confirmed to a device that is not an organizer", async () => {
    await assertFails(set(ref(db("uid-a"), paths.datesConfirmed(T)), { optionId: "o1", by: "alice", at: 1 }));
    await assertFails(set(ref(db("uid-a"), paths.stayConfirmed(T, "bali")), { stayId: "s1", by: "alice", at: 1 }));
  });

  it("6. makes a device an organizer with a real key, and refuses a wrong key", async () => {
    const b = db("uid-b");
    await assertFails(set(ref(b, paths.organizerClaim(T, "uid-b")), "WrongKey0123456789abc"));
    await assertFails(set(ref(b, paths.organizer(T, "uid-b")), true));
    await assertSucceeds(set(ref(b, paths.organizerClaim(T, "uid-b")), KEY));
    await assertSucceeds(set(ref(b, paths.organizer(T, "uid-b")), true));
  });

  it("7. refuses any read of /tripSecrets", async () => {
    await assertFails(get(ref(db("uid-o"), `tripSecrets/${T}`)));
    await assertFails(get(ref(db("uid-b"), paths.organizerClaim(T, "uid-b"))));
  });

  it("8. refuses an answer of \"perhaps\", a name of 200 characters and an unknown destination", async () => {
    const a = db("uid-a");
    await assertFails(set(ref(a, paths.answer(T, "o1", "alice")), "perhaps"));
    await assertFails(set(ref(a, paths.member(T, "alice")), { name: "x".repeat(200), reply: "in", at: 1 }));
    await assertFails(set(ref(a, paths.stayOption(T, "s2")),
      { destination: "mars", url: "https://www.airbnb.com/rooms/2", name: "Villa", area: "Uluwatu", addedBy: "alice", at: 1 }));
  });

  it("9. lets only the member who added a show, or an organizer, edit or remove it", async () => {
    await assertFails(update(ref(db("uid-c"), paths.show(T, "f1")), { artist: "Carl's edit" }));
    await assertSucceeds(update(ref(db("uid-a"), paths.show(T, "f1")), { artist: "Alice's edit" }));
    await assertFails(remove(ref(db("uid-a"), paths.show(T, "seed1"))));
    await assertSucceeds(update(ref(db("uid-a"), "/"), { [paths.show(T, "f1")]: null, [paths.showIn(T, "f1")]: null }));
    await assertSucceeds(remove(ref(db("uid-o"), paths.show(T, "seed1"))));
  });

  it("10. lets a friend add a date option with its Yes in one write, under its own member", async () => {
    const id = "2027-02-18_2027-02-24";
    await assertSucceeds(update(ref(db("uid-a"), "/"), {
      [paths.dateOption(T, id)]: { from: "2027-02-18", to: "2027-02-24", addedBy: "alice", at: 1 },
      [paths.answer(T, id, "alice")]: "yes",
    }));
    await assertFails(set(ref(db("uid-a"), paths.dateOption(T, "2027-02-19_2027-02-25")), { from: "2027-02-19", to: "2027-02-25", addedBy: "bob", at: 1 }));
  });

  it("11. refuses an option over one that exists, and lets the adder remove it with its answers", async () => {
    const id = "2027-03-01_2027-03-05";
    await assertSucceeds(set(ref(db("uid-b"), paths.dateOption(T, id)), { from: "2027-03-01", to: "2027-03-05", addedBy: "bob", at: 1 }));
    await assertFails(set(ref(db("uid-a"), paths.dateOption(T, id)), { from: "2027-03-01", to: "2027-03-05", addedBy: "alice", at: 2 }));
    await assertFails(remove(ref(db("uid-a"), paths.dateOption(T, id))));
    await assertSucceeds(update(ref(db("uid-b"), "/"), { [paths.dateOption(T, id)]: null, [paths.optionAnswers(T, id)]: null }));
  });

  it("12. refuses an option outside the season, or with To before From", async () => {
    const a = db("uid-a");
    await assertFails(set(ref(a, paths.dateOption(T, "2027-03-28_2027-04-02")), { from: "2027-03-28", to: "2027-04-02", addedBy: "alice", at: 1 }));
    await assertFails(set(ref(a, paths.dateOption(T, "2027-02-20_2027-02-10")), { from: "2027-02-20", to: "2027-02-10", addedBy: "alice", at: 1 }));
  });
});
