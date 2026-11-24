/**
 * The rules tests of Trip 2 (1 to 9), of the admin list (10 to 12, plan
 * D15), of Add dates (13 to 15, plan D16), of Add to map (16 and 17), of
 * weekly shows (18), of the profile photo (19), of a place's photo (20) and
 * of the invite title (21), of organizer keys (22), of trip texts (23 to 25), of the events window (26) and of venue tags (27), against the database emulator. Run with
 * `npm run test:rules` in web/; it starts the emulator, runs this file and
 * stops it. Each test names the rule it proves, in the words of plan
 * section 4.
 */
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { get, ref, remove, set, update } from "firebase/database";
import { afterAll, beforeAll, describe, it } from "vitest";
import { emailKey } from "../src/lib/ids";
import * as paths from "../src/lib/paths";

const T = "t1";
const KEY = "Key0123456789abcdefXYZ";
let env: RulesTestEnvironment;

const db = (uid?: string) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).database();
const ADMIN = "Owner@Example.com";
/** A device signed in with Google: its email, verified or not. */
const google = (uid: string, email: string, verified: boolean) =>
  env.authenticatedContext(uid, { email, email_verified: verified }).database();
const place = (extra: object) => ({ name: "Sunset bar", kind: "food", destination: "bali", lat: -8.64, lng: 115.14, at: 1, ...extra });
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
      tripSecrets: { [T]: { organizerKey: { [KEY]: true }, admins: { [emailKey(ADMIN)]: true } } },
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

  it("10. makes a device an organizer when its verified email is on the admin list", () =>
    assertSucceeds(set(ref(google("uid-g1", "owner@example.com", true), paths.organizer(T, "uid-g1")), true)));

  it("11. refuses the organizer mark to an admin email that is not verified", () =>
    assertFails(set(ref(google("uid-g2", "owner@example.com", false), paths.organizer(T, "uid-g2")), true)));

  it("12. refuses the organizer mark to a verified email that is not on the admin list", () =>
    assertFails(set(ref(google("uid-g3", "friend@example.com", true), paths.organizer(T, "uid-g3")), true)));

  it("13. lets a friend add a date option with its Yes in one write, under its own member", async () => {
    const id = "2027-02-18_2027-02-24";
    await assertSucceeds(update(ref(db("uid-a"), "/"), {
      [paths.dateOption(T, id)]: { from: "2027-02-18", to: "2027-02-24", addedBy: "alice", at: 1 },
      [paths.answer(T, id, "alice")]: "yes",
    }));
    await assertFails(set(ref(db("uid-a"), paths.dateOption(T, "2027-02-19_2027-02-25")), { from: "2027-02-19", to: "2027-02-25", addedBy: "bob", at: 1 }));
  });

  it("14. refuses an option over one that exists, and lets the adder remove it with its answers", async () => {
    const id = "2027-03-01_2027-03-05";
    await assertSucceeds(set(ref(db("uid-b"), paths.dateOption(T, id)), { from: "2027-03-01", to: "2027-03-05", addedBy: "bob", at: 1 }));
    await assertFails(set(ref(db("uid-a"), paths.dateOption(T, id)), { from: "2027-03-01", to: "2027-03-05", addedBy: "alice", at: 2 }));
    await assertFails(remove(ref(db("uid-a"), paths.dateOption(T, id))));
    await assertSucceeds(update(ref(db("uid-b"), "/"), { [paths.dateOption(T, id)]: null, [paths.optionAnswers(T, id)]: null }));
  });

  it("15. refuses an option outside the season, or with To before From", async () => {
    const a = db("uid-a");
    await assertFails(set(ref(a, paths.dateOption(T, "2027-03-28_2027-04-02")), { from: "2027-03-28", to: "2027-04-02", addedBy: "alice", at: 1 }));
    await assertFails(set(ref(a, paths.dateOption(T, "2027-02-20_2027-02-10")), { from: "2027-02-20", to: "2027-02-10", addedBy: "alice", at: 1 }));
  });

  it("16. lets a member put a place on the map under its member, and refuses it under another", async () => {
    await assertSucceeds(set(ref(db("uid-a"), paths.customPlace(T, "p1")), place({ addedBy: "alice" })));
    await assertFails(set(ref(db("uid-a"), paths.customPlace(T, "p2")), place({ addedBy: "bob" })));
  });

  it("17. takes a place anywhere in the world, and refuses a position off the globe", async () => {
    await assertSucceeds(set(ref(db("uid-a"), paths.customPlace(T, "p3")), place({ addedBy: "alice", lat: 40.71, lng: -74.0 })));
    await assertFails(set(ref(db("uid-a"), paths.customPlace(T, "p4")), place({ addedBy: "alice", lat: 95, lng: 100.0 })));
  });

  it("18. takes a weekly show's day as a day name and refuses anything else", async () => {
    const a = db("uid-a");
    await assertSucceeds(set(ref(a, paths.show(T, "w1")), show({ source: "friend", addedBy: "alice", artist: "Sunday Session", date: "2027-02-07", weekly: "sun" })));
    await assertFails(set(ref(a, paths.show(T, "w2")), show({ source: "friend", addedBy: "alice", artist: "Funday", date: "2027-02-07", weekly: "sunday" })));
  });

  it("19. keeps a member's photo, and refuses one that is too long or not a JPEG data URL", async () => {
    const a = db("uid-a");
    await set(ref(a, paths.member(T, "alice")), { name: "Alice", reply: "in", at: 1 });
    await assertSucceeds(set(ref(a, paths.memberField(T, "alice", "photo")), "data:image/jpeg;base64,/9j/4AAQ"));
    await assertFails(set(ref(a, paths.memberField(T, "alice", "photo")), "data:image/jpeg;base64," + "A".repeat(30000)));
    await assertFails(set(ref(a, paths.memberField(T, "alice", "photo")), "data:image/png;base64,iVBOR"));
  });

  it("20. keeps a place's photo and description, and refuses a photo over 80 000 characters", async () => {
    const a = db("uid-a");
    await assertSucceeds(set(ref(a, paths.customPlace(T, "ph1")), place({ addedBy: "alice", description: "Sunset drinks", photo: "data:image/jpeg;base64,/9j/4AAQ" })));
    await assertFails(set(ref(a, paths.customPlace(T, "ph2")), place({ addedBy: "alice", photo: "data:image/jpeg;base64," + "A".repeat(80000) })));
  });

  it("21. lets only an organizer write the invite title, of 1 to 60 characters", async () => {
    await assertFails(set(ref(db("uid-a"), paths.inviteTitle(T)), "Alice's trip"));
    await assertSucceeds(set(ref(db("uid-o"), paths.inviteTitle(T)), "Bali & Koh Phangan 2027"));
    await assertFails(set(ref(db("uid-o"), paths.inviteTitle(T)), "x".repeat(61)));
  });

  it("22. lets an organizer add an organizer key, never a friend, and never over one", async () => {
    await assertFails(set(ref(db("uid-a"), paths.organizerKey(T, "FriendKey0123456789abcde")), true));
    await assertSucceeds(set(ref(db("uid-o"), paths.organizerKey(T, "CoOrgKey0123456789abcdef")), true));
    await assertFails(set(ref(db("uid-o"), paths.organizerKey(T, KEY)), null));
  });

  // Fictional numbers only: the repo is public.
  const number = (e164: string) => ({ e164, at: 1 });

  it("23. lets a member write, read and remove only its own phone, in E.164", async () => {
    const a = db("uid-a");
    await assertSucceeds(set(ref(a, paths.phone(T, "alice")), number("+14155550101")));
    await assertSucceeds(get(ref(a, paths.phone(T, "alice"))));
    await assertFails(set(ref(a, paths.phone(T, "bob")), number("+14155550102")));
    await assertFails(set(ref(a, paths.phone(T, "alice")), number("415-555-0101")));
    await assertSucceeds(remove(ref(a, paths.phone(T, "alice"))));
  });

  it("24. lets an organizer read every phone, and no friend read another's or the list", async () => {
    await set(ref(db("uid-b"), paths.phone(T, "bob")), number("+14155550102"));
    await assertFails(get(ref(db("uid-a"), paths.phone(T, "bob"))));
    await assertFails(get(ref(db("uid-a"), paths.phones(T))));
    await assertSucceeds(get(ref(db("uid-o"), paths.phones(T))));
  });

  it("25. lets only an organizer count a day's texts, one at a time, up to 5, with no reset", async () => {
    const day = paths.textLog(T, "2027-02-01");
    await assertFails(set(ref(db("uid-a"), day), { texts: 1, at: 1 }));
    await assertFails(set(ref(db("uid-o"), day), { texts: 3, at: 1 }));
    for (let texts = 1; texts <= 5; texts++) await assertSucceeds(set(ref(db("uid-o"), day), { texts, at: texts }));
    await assertFails(set(ref(db("uid-o"), day), { texts: 6, at: 6 }));
    await assertFails(set(ref(db("uid-o"), day), { texts: 1, at: 7 }));
    await assertFails(remove(ref(db("uid-o"), day)));
  });

  it("26. takes a show from 25 Jan to 31 Mar 2027 and refuses 24 Jan and 1 Apr", async () => {
    const a = db("uid-a");
    const on = (id: string, date: string) => set(ref(a, paths.show(T, id)), show({ source: "friend", addedBy: "alice", artist: "Zamna", date }));
    await assertSucceeds(on("j1", "2027-01-25"));
    await assertSucceeds(on("j2", "2027-01-31"));
    await assertSucceeds(on("m1", "2027-03-31"));
    await assertFails(on("j0", "2027-01-24"));
    await assertFails(on("a1", "2027-04-01"));
  });

  it("27. lets only an organizer tag a venue and name a tag, with a short slug and name", async () => {
    await assertFails(set(ref(db("uid-a"), paths.venueTag(T, "savaya", "big")), true));
    await assertFails(set(ref(db("uid-a"), paths.tagName(T, "big")), "Big nights"));
    const o = db("uid-o");
    await assertSucceeds(update(ref(o), { [paths.venueTag(T, "savaya", "rooftop")]: true, [paths.tagName(T, "rooftop")]: "Rooftop" }));
    await assertSucceeds(remove(ref(o, paths.venueTag(T, "savaya", "rooftop"))));
    await assertFails(set(ref(o, paths.venueTag(T, "savaya", "Not A Slug")), true));
    await assertFails(set(ref(o, paths.tagName(T, "long")), "x".repeat(25)));
  });
});
