import { describe, expect, it } from "vitest";
import type { Trip } from "../../types/trip";
import { stage } from "./stage";

// The header examples of stage(), one test each.
const options = { o1: { from: "2027-02-13", to: "2027-02-23" } };
const confirmedDates = { options, confirmed: { optionId: "o1", by: "jd", at: 1 } };
const villa = { destination: "bali", url: "https://www.airbnb.com/rooms/1", name: "Villa", area: "Uluwatu", addedBy: "ka", at: 1 };
const show = { destination: "bali", venue: "Savaya", date: "2027-02-13", artist: "Peggy Gou", verified: true, source: "seed" as const, at: 1 };

describe("stage", () => {
  it("leads with dates while no date option is confirmed", () => {
    expect(stage({ dates: { options }, stay: { options: { s1: villa } } }, "rb")).toBe("dates");
  });

  it("leads with stay once the dates are confirmed and a destination with options has no confirmed stay", () => {
    expect(stage({ dates: confirmedDates, stay: { options: { s1: villa } } }, "rb")).toBe("stay");
  });

  it("goes back to dates when the organizer undoes the date confirm, even with every stay confirmed (case 42)", () => {
    const trip: Trip = { dates: { options }, stay: { options: { s1: villa }, confirmed: { bali: { stayId: "s1", by: "jd", at: 1 } } } };
    expect(stage(trip, "rb")).toBe("dates");
  });

  it("skips stay when no destination has a stay option, and leads with parties", () => {
    expect(stage({ dates: confirmedDates, parties: { shows: { p1: show } } }, "rb")).toBe("parties");
  });

  it("is all set once the member is in for a show", () => {
    expect(stage({ dates: confirmedDates, parties: { shows: { p1: show }, in: { p1: { rb: true } } } }, "rb")).toBe("allSet");
  });
});
