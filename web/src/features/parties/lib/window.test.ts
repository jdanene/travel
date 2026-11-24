import { describe, expect, it } from "vitest";
import { inEventsWindow } from "./window";

// The header examples of inEventsWindow(), one test each.
describe("inEventsWindow", () => {
  it("takes a day in the last week of January", () => expect(inEventsWindow("2027-01-30")).toBe(true));
  it("refuses the day before the window", () => expect(inEventsWindow("2027-01-24")).toBe(false));
  it("refuses a day that does not exist", () => expect(inEventsWindow("2027-02-30")).toBe(false));
});
