import { describe, expect, it } from "vitest";
import { stage } from "./stage";

// The header examples of stage(), one test each.
const options = { o1: { from: "2027-02-13", to: "2027-02-23" } };
const confirmedDates = { options, confirmed: { optionId: "o1", by: "jd", at: 1 } };
const villa = { destination: "bali", url: "https://www.airbnb.com/rooms/1", name: "Villa", area: "Uluwatu", addedBy: "ka", at: 1 };
const baliStay = { bali: { stayId: "s1", by: "jd", at: 1 } };

describe("stage", () => {
  it("is dates while no date option is confirmed", () => {
    expect(stage({ dates: { options }, stay: { options: { s1: villa } } })).toBe("dates");
  });

  it("is plan once the dates are confirmed and a destination with options has no confirmed stay", () => {
    expect(stage({ dates: confirmedDates, stay: { options: { s1: villa } } })).toBe("plan");
  });

  it("is allSet once every destination with options has a confirmed stay", () => {
    expect(stage({ dates: confirmedDates, stay: { options: { s1: villa }, confirmed: baliStay } })).toBe("allSet");
  });

  it("goes back to dates when the organizer undoes the date confirm, even with every stay confirmed (case 42)", () => {
    expect(stage({ dates: { options }, stay: { options: { s1: villa }, confirmed: baliStay } })).toBe("dates");
  });

  it("stays at plan when the dates are confirmed but nobody has added a place yet", () => {
    expect(stage({ dates: confirmedDates })).toBe("plan");
  });
});
