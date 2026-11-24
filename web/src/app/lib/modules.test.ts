import { describe, expect, it } from "vitest";
import { allSet, modules } from "./modules";

// The header examples of modules() and allSet(), one test each.
const options = { o1: { from: "2027-02-13", to: "2027-02-23" } };
const confirmedDates = { options, confirmed: { optionId: "o1", by: "jd", at: 1 } };
const villa = { destination: "bali", url: "https://www.airbnb.com/rooms/1", name: "Cliffside villa", area: "Uluwatu", addedBy: "ka", at: 1 };

describe("modules", () => {
  it("has no Stay before the dates are confirmed", () => {
    const shown = modules({ dates: { options }, stay: { options: { s1: villa } } }, "rb");
    expect(shown.map((module) => module.id)).toEqual(["dates", "parties", "links", "map"]);
    expect(shown[0].lines).toEqual(["Tap to answer"]);
  });

  it("adds Stay once the dates are confirmed", () => {
    const shown = modules({ dates: confirmedDates, stay: { options: { s1: villa } } }, "rb");
    expect(shown.map((module) => [module.id, module.lines])).toEqual([
      ["dates", ["13–23 Feb · confirmed"]],
      ["stay", ["1 option · heart one"]],
      ["parties", ["Nothing announced yet."]],
      ["links", ["No links yet."]],
      ["map", []],
    ]);
  });

  it("shows the results when everything is confirmed, and the trip is all set", () => {
    const trip = { dates: confirmedDates, stay: { options: { s1: villa }, confirmed: { bali: { stayId: "s1", by: "jd", at: 1 } } } };
    expect(modules(trip, "rb")[1].lines).toEqual(["Cliffside villa · confirmed"]);
    expect(allSet(trip)).toBe(true);
  });
});
