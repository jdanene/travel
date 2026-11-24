import { describe, expect, it } from "vitest";
import { seasonLine } from "./format";

// The header examples of seasonLine.
describe("seasonLine", () => {
  it("writes the trip's two months short, with one year", () => {
    expect(seasonLine("2027-02-01", "2027-03-31", "short")).toBe("Feb–Mar 2027");
  });
  it("writes both years when the trip crosses New Year", () => {
    expect(seasonLine("2026-12-20", "2027-01-05", "long")).toBe("December 2026 to January 2027");
  });
});
