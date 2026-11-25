/**
 * The rules tests of Trip 2 (1 to 9), of the admin list (10 to 12, plan
 * D15), of Add dates (13 to 15, plan D16), of Add to map (16 and 17), of
 * weekly shows (18), of the profile photo (19), of a place's photo (20) and
 * of the invite title (21), of organizer keys (22), of trip texts (23 to 25), of the events window (26), of event tags (27), of the Activity list (28 to 35) and of an event's picture (36), against the database emulator. Run with
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
    database: { rules: readFileSync("../database.rules.json", "utf8"), host: "127.0.0.1", port: Number(process.env.RULES_DB_PORT ?? 9000) },
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

  it("15. refuses an option with To before From", async () => {
    const a = db("uid-a");
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


  it("27. lets any member tag an event and name a new tag, with a short slug and name, and refuses a device that has not joined", async () => {
    // Any day is a show's day (owner, 24 Nov 2026: "no restrictions"); this one is in January.
    await assertSucceeds(set(ref(db("uid-a"), paths.show(T, "j1")), show({ source: "friend", addedBy: "alice", date: "2027-01-10" })));
    const x = db("uid-x");
    await assertFails(set(ref(x, paths.showTag(T, "j1", "big")), true));
    await assertFails(set(ref(x, paths.tagName(T, "x")), "X"));
    const a = db("uid-a");
    await assertSucceeds(update(ref(a), { [paths.showTag(T, "j1", "rooftop")]: true, [paths.tagName(T, "rooftop")]: "Rooftop" }));
    await assertSucceeds(remove(ref(db("uid-b"), paths.showTag(T, "j1", "rooftop"))));
    await assertFails(set(ref(a, paths.tagName(T, "rooftop")), "Roof"));
    await assertFails(set(ref(a, paths.showTag(T, "j1", "Not A Slug")), true));
    await assertFails(set(ref(a, paths.showTag(T, "j1", "big")), false));
    await assertFails(set(ref(a, paths.showTag(T, "nope", "big")), true));
    await assertFails(set(ref(a, paths.tagName(T, "long")), "x".repeat(25)));
  });
  it("28. lets a member post as itself, and refuses a post as another member or with no text", async () => {
    const a = db("uid-a");
    await assertSucceeds(set(ref(a, paths.activityEntry(T, "p1")), { kind: "post", by: "alice", at: 1, text: "Anyone flying from London?" }));
    await assertFails(set(ref(a, paths.activityEntry(T, "p2")), { kind: "post", by: "bob", at: 1, text: "Hi" }));
    await assertFails(set(ref(a, paths.activityEntry(T, "p3")), { kind: "post", by: "alice", at: 1 }));
    await assertFails(set(ref(a, paths.activityEntry(T, "p4")), { kind: "post", by: "alice", at: 1, text: "x".repeat(501) }));
    await assertFails(set(ref(db("uid-x"), paths.activityEntry(T, "p5")), { kind: "event-found", at: 1, text: "Zamna" }));
    await assertSucceeds(set(ref(a, paths.activityEntry(T, "f1")), { kind: "event-found", at: 1, text: "Zamna at Phuket, 29 Jan" }));
  });

  it("29. refuses an edit to a line, even by its author, and a poll with one option or a long one", async () => {
    const a = db("uid-a");
    await assertFails(set(ref(a, paths.activityEntry(T, "p1")), { kind: "post", by: "alice", at: 2, text: "Edited" }));
    await assertFails(set(ref(a, `${paths.activityEntry(T, "p1")}/text`), "Edited"));
    await assertFails(set(ref(a, paths.activityEntry(T, "q2")), { kind: "poll", by: "alice", at: 1, text: "Villa?", options: ["Yes"] }));
    await assertFails(set(ref(a, paths.activityEntry(T, "q3")), { kind: "poll", by: "alice", at: 1, text: "Villa?", options: ["Yes", "x".repeat(61)] }));
    await assertSucceeds(set(ref(a, paths.activityEntry(T, "q1")), { kind: "poll", by: "alice", at: 1, text: "Villa or hotel?", options: ["Villa", "Hotel"] }));
  });

  it("30. lets a member vote and reply under its own member, change its vote, and refuses under another", async () => {
    const b = db("uid-b");
    await assertSucceeds(set(ref(b, paths.activityVote(T, "q1", "bob")), 0));
    await assertSucceeds(set(ref(b, paths.activityVote(T, "q1", "bob")), 1));
    await assertFails(set(ref(b, paths.activityVote(T, "q1", "alice")), 0));
    await assertFails(set(ref(b, paths.activityVote(T, "q1", "bob")), 2));
    await assertSucceeds(set(ref(b, paths.activityReply(T, "p1", "r1")), { by: "bob", at: 1, text: "Me!" }));
    await assertFails(set(ref(b, paths.activityReply(T, "p1", "r2")), { by: "alice", at: 1, text: "Me!" }));
  });

  it("31. lets the author delete its post with its replies and votes, and refuses another friend", async () => {
    await assertFails(update(ref(db("uid-c")), { [paths.activityEntry(T, "p1")]: null, [paths.activityReplies(T, "p1")]: null }));
    await assertSucceeds(update(ref(db("uid-a")), { [paths.activityEntry(T, "p1")]: null, [paths.activityReplies(T, "p1")]: null }));
    await assertSucceeds(update(ref(db("uid-o")), { [paths.activityEntry(T, "q1")]: null, [paths.activityVotes(T, "q1")]: null }));
    await assertFails(remove(ref(db("uid-a"), paths.activityEntry(T, "f1"))));
  });

  it("32. takes a GIF post from KLIPY's host only, and several emoji per member under its own id", async () => {
    const a = db("uid-a");
    const b = db("uid-b");
    const gif = "https://static.klipy.com/ii/935d7ab9d8c6202580a668421940ec81/14/af/JUY.webp";
    await assertSucceeds(set(ref(a, paths.activityEntry(T, "g1")), { kind: "post", by: "alice", at: 1, gif, gifW: 498, gifH: 498 }));
    await assertFails(set(ref(a, paths.activityEntry(T, "g2")), { kind: "post", by: "alice", at: 1, gif: "https://evil.example/x.gif" }));
    await assertSucceeds(set(ref(b, paths.activityReaction(T, "g1", "bob", "1f525")), 1));
    await assertSucceeds(set(ref(b, paths.activityReaction(T, "g1", "bob", "7tv-01FCY771D800007PQ2DF3GDTN6-RainTime")), 2));
    await assertFails(set(ref(b, paths.activityReaction(T, "g1", "alice", "1f525")), 1));
    await assertFails(set(ref(b, paths.activityReaction(T, "g1", "bob", "Not-a-key")), 1));
    await assertFails(set(ref(b, paths.activityReaction(T, "nope", "bob", "1f525")), 1));
    await assertSucceeds(update(ref(a), { [paths.activityEntry(T, "g1")]: null, [paths.activityReactions(T, "g1")]: null }));
  });

  it("33. lets a member take its own automatic line off the Feed, with its emoji, and refuses another friend", async () => {
    const a = db("uid-a");
    await assertSucceeds(set(ref(a, paths.activityEntry(T, "in1")), { kind: "event-in", by: "alice", at: 1, text: "Peggy Gou at Savaya", ref: "show1" }));
    await assertFails(update(ref(db("uid-c")), { [paths.activityEntry(T, "in1")]: null, [paths.activityReactions(T, "in1")]: null }));
    await assertSucceeds(update(ref(a), { [paths.activityEntry(T, "in1")]: null, [paths.activityReactions(T, "in1")]: null }));
  });
  it("34. lets a member reply under an automatic line, and its author take the line off with the replies", async () => {
    const a = db("uid-a");
    await assertSucceeds(set(ref(a, paths.activityEntry(T, "in2")), { kind: "event-in", by: "alice", at: 1, text: "Peggy Gou at Savaya", ref: "show1" }));
    await assertSucceeds(set(ref(db("uid-b"), paths.activityReply(T, "in2", "r1")), { by: "bob", at: 2, text: "Same!" }));
    await assertFails(set(ref(a, paths.activityReply(T, "gone", "r1")), { by: "alice", at: 2, text: "Hi" }));
    await assertSucceeds(update(ref(a), { [paths.activityEntry(T, "in2")]: null, [paths.activityReactions(T, "in2")]: null, [paths.activityReplies(T, "in2")]: null }));
  });

  it("35. takes a GIF reply from KLIPY's host with no words, and refuses one from another host", async () => {
    const b = db("uid-b");
    await assertSucceeds(set(ref(db("uid-a"), paths.activityEntry(T, "g3")), { kind: "post", by: "alice", at: 1, text: "Who's in?" }));
    await assertSucceeds(set(ref(b, paths.activityReply(T, "g3", "r1")), { by: "bob", at: 2, gif: "https://static.klipy.com/ii/a1/b2/c3.webp", gifW: 220, gifH: 220 }));
    await assertFails(set(ref(b, paths.activityReply(T, "g3", "r2")), { by: "bob", at: 2, gif: "https://evil.example/x.gif" }));
  });

  it("36. lets a reply's author delete it, refuses another friend, and never an edit", async () => {
    const a = db("uid-a");
    const b = db("uid-b");
    await assertSucceeds(set(ref(a, paths.activityEntry(T, "d1")), { kind: "post", by: "alice", at: 1, text: "Flights?" }));
    await assertSucceeds(set(ref(b, paths.activityReply(T, "d1", "r1")), { by: "bob", at: 2, text: "Booked" }));
    await assertFails(set(ref(a, paths.activityReply(T, "d1", "r1")), null));
    await assertFails(set(ref(b, paths.activityReply(T, "d1", "r1")), { by: "bob", at: 3, text: "Edited" }));
    await assertSucceeds(set(ref(b, paths.activityReply(T, "d1", "r1")), null));
  });

  it("37. keeps an event's https picture on a friend's own edit, and refuses one that is not https", async () => {
    const a = db("uid-a");
    await assertSucceeds(set(ref(a, paths.show(T, "p1")), show({ source: "friend", addedBy: "alice", artist: "Picture night", photoUrl: "https://example.com/flyer.jpg" })));
    await assertFails(set(ref(a, paths.show(T, "p1")), show({ source: "friend", addedBy: "alice", artist: "Picture night", photoUrl: "http://example.com/flyer.jpg" })));
  });
});
