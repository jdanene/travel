import { describe, expect, it } from "vitest";
import { showId } from "./shows";

// The header examples of showId(), one test each.
describe("showId", () => {
  it("joins destination, date, venue and artist", () => {
    expect(showId({ destination: "bali", venue: "Savaya", date: "2027-02-13", artist: "Peggy Gou" })).toBe(
      "bali_2027-02-13_savaya_peggy-gou",
    );
  });

  it("ignores case and spaces, so two spellings of one party are one show", () => {
    expect(showId({ destination: "bali", venue: " SAVAYA ", date: "2027-02-13", artist: "peggy   gou" })).toBe(
      showId({ destination: "bali", venue: "Savaya", date: "2027-02-13", artist: "Peggy Gou" }),
    );
  });
});
