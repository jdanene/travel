import { describe, expect, it } from "vitest";
import { addDays, addMonths, isDay, monthGrid } from "./calendar";

// The header examples of the calendar's day arithmetic.
describe("calendar", () => {
  it("takes any real day", () => expect(isDay("2027-01-24")).toBe(true));
  it("refuses a day that does not exist", () => expect(isDay("2027-02-30")).toBe(false));
  it("crosses a month", () => expect(addDays("2027-02-28", 1)).toBe("2027-03-01"));
  it("crosses a year back", () => expect(addMonths("2027-01", -1)).toBe("2026-12"));
  it("lays February 2027 out in four weeks from Monday the 1st", () => {
    const weeks = monthGrid("2027-02");
    expect(weeks).toHaveLength(4);
    expect([weeks[0][0], weeks[3][6]]).toEqual(["2027-02-01", "2027-02-28"]);
  });
  it("pads March 2027 to whole weeks", () => {
    const weeks = monthGrid("2027-03");
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toBe("2027-03-01");
    expect(weeks[4].filter((cell) => cell === null)).toHaveLength(4);
  });
});
