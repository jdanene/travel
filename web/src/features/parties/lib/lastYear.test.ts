import { describe, expect, it } from "vitest";
import { lastSeason, lastYearLines, lastSeasonRest } from "./lastYear";
import { EVENTS_WINDOW as season } from "./window";
const savaya = (date: string, artist: string) => ({ destination: "bali", venue: "Savaya", date, artist });

// The header examples of lastYearLines(), one test each.
describe("lastYearLines", () => {
  it("gives screen 7's Savaya line for the empty weekend of Sat 6 – Sun 7 Feb, and one for the last weekend of January", () => {
    const shows = [savaya("2027-02-13", "Peggy Gou"), savaya("2027-02-14", "Baby J")];
    const lastYear = [
      savaya("2026-01-31", "Black Coffee"),
      savaya("2026-02-06", "Peggy Gou"), // a Friday: no weekend line holds it
      savaya("2026-02-07", "Nic Fanciulli"),
      savaya("2026-02-08", "Francis Mercier"),
      savaya("2026-02-14", "Argy"), // this year has Sat 13 Feb: no line
    ];
    expect(lastYearLines(shows, lastYear, season)).toEqual([
      { destination: "bali", venue: "Savaya", from: "2027-01-30", to: "2027-01-31", shows: [{ date: "2026-01-31", artist: "Black Coffee" }] },
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

});

describe("lastSeasonRest", () => {
  const desa = (date: string, artist: string) => ({ destination: "bali", venue: "Desa Kitsuné", date, artist });
  const lastYear = [desa("2026-02-14", "Zai Love"), desa("2026-02-17", "Savaya × Desa"), desa("2026-03-13", "Claptone")];
  const line = { destination: "bali", venue: "Desa Kitsuné", from: "2027-02-13", to: "2027-02-14", shows: [{ date: "2026-02-14", artist: "Zai Love" }] };
  it("keeps the acts no weekend line shows, newest first", () => {
    expect(lastSeasonRest("bali", "Desa Kitsuné", lastYear, [line]).map((show) => show.artist)).toEqual(["Claptone", "Savaya × Desa"]);
  });
  it("is empty when every act is in a weekend line", () => {
    expect(lastSeasonRest("bali", "Desa Kitsuné", [lastYear[0]], [line])).toEqual([]);
  });
});
