import { describe, expect, it } from "vitest";
import { CHECK_EVERY_MS, checkIsDue, newShows } from "./eventCheck";

// The header examples of checkIsDue() and newShows(), one test each.
const now = Date.UTC(2026, 10, 23, 12);

describe("checkIsDue", () => {
  it("is due with no last check, and 24 hours after the last, not 23", () => {
    expect(CHECK_EVERY_MS).toBe(24 * 3_600_000);
    expect(checkIsDue(undefined, now)).toBe(true);
    expect(checkIsDue(now - 24 * 3_600_000, now)).toBe(true);
    expect(checkIsDue(now - 23 * 3_600_000, now)).toBe(false);
  });

  it("is not due when the last check is ahead of this clock", () => {
    expect(checkIsDue(now + 30_000, now)).toBe(false);
  });
});

describe("newShows", () => {
  const trip = {
    info: { name: "Bali · Koh Phangan", season: { from: "2027-02-01", to: "2027-03-31" }, anchor: { name: "Full Moon Party", date: "2027-02-22" }, destinations: { bali: { name: "Bali" } } },
    parties: { shows: { "bali_2027-02-13_savaya_peggy-gou": { destination: "bali", venue: "Savaya", date: "2027-02-13", artist: "Peggy Gou", verified: true, source: "seed" as const, at: 1 } } },
  };
  const event = (date: string, artist: string) => ({ destination: "bali", venue: "Savaya", area: "Uluwatu", date, artist, link: `https://www.savaya.com/event-calendar/${date}` });

  it("adds an event the trip does not list, as a show nobody added", () => {
    expect(newShows([event("2027-02-28", "BEN BÖHMER")], trip, now)).toEqual({
      "bali_2027-02-28_savaya_ben-bohmer": { ...event("2027-02-28", "BEN BÖHMER"), verified: false, source: "check", at: now },
    });
  });

  it("adds nothing for a seeded show the club writes in capitals, nor for a day that does not exist", () => {
    expect(newShows([event("2027-02-13", "PEGGY GOU"), event("2027-02-30", "Nobody")], trip, now)).toEqual({});
  });
});
