import { describe, expect, it } from "vitest";
import { lastSeason, lastYearLines } from "./lastYear";

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

// The header examples of lastSeason(), one test each.
describe("lastSeason", () => {
  const atlas = (date: string, artist: string) => ({ destination: "bali", venue: "Atlas Beach Club", date, artist });

  it("lists last year's acts at the venue, newest first", () => {
    const lastYear = [atlas("2026-01-01", "Swae Lee"), atlas("2026-01-31", "Afrojack"), atlas("2026-01-02", "Rudimental"), savaya("2026-02-07", "Nic Fanciulli")];
    expect(lastSeason("bali", "Atlas Beach Club", lastYear).map((show) => show.artist)).toEqual(["Afrojack", "Rudimental", "Swae Lee"]);
  });

  it("gives nothing for a venue last year never listed", () => {
    expect(lastSeason("bali", "La Brisa", [atlas("2026-01-31", "Afrojack")])).toEqual([]);
  });

  it("keeps only the three newest", () => {
    const lastYear = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-02-01", "2026-02-07"].map((date, i) => savaya(date, `Act ${i}`));
    expect(lastSeason("bali", " savaya", lastYear)).toEqual([
      { date: "2026-02-07", artist: "Act 4" },
      { date: "2026-02-01", artist: "Act 3" },
      { date: "2026-01-03", artist: "Act 2" },
    ]);
  });
});
