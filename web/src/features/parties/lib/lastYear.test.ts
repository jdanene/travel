import { describe, expect, it } from "vitest";
import { lastYearLines } from "./lastYear";

const season = { from: "2027-02-01", to: "2027-03-31" };
const savaya = (date: string, artist: string) => ({ destination: "bali", venue: "Savaya", date, artist });

// The header examples of lastYearLines(), one test each.
describe("lastYearLines", () => {
  it("gives screen 7's Savaya line for the empty weekend of Sat 6 – Sun 7 Feb", () => {
    const shows = [savaya("2027-02-13", "Peggy Gou"), savaya("2027-02-14", "Baby J")];
    const lastYear = [
      savaya("2026-02-06", "Peggy Gou"), // a Friday: no weekend line holds it
      savaya("2026-02-07", "Nic Fanciulli"),
      savaya("2026-02-08", "Francis Mercier"),
      savaya("2026-02-14", "Argy"), // this year has Sat 13 Feb: no line
    ];
    expect(lastYearLines(shows, lastYear, season)).toEqual([
      {
        destination: "bali",
        venue: "Savaya",
        from: "2027-02-06",
        to: "2027-02-07",
        shows: [
          { date: "2026-02-07", artist: "Nic Fanciulli" },
          { date: "2026-02-08", artist: "Francis Mercier" },
        ],
      },
    ]);
  });

  it("matches a venue across case and spaces, and reaches back across a month end", () => {
    const shows = [savaya("2027-02-13", "Peggy Gou")];
    const lastYear = [{ destination: "bali", venue: " SAVAYA", date: "2026-03-01", artist: "Mahmut Orhan" }];
    expect(lastYearLines(shows, lastYear, season)).toEqual([
      { destination: "bali", venue: "Savaya", from: "2027-02-27", to: "2027-02-28", shows: [{ date: "2026-03-01", artist: "Mahmut Orhan" }] },
    ]);
  });
});
