import { describe, expect, it } from "vitest";
import { areaShown, eventLink, placeLine, placeOf, whenLine } from "./detail";

// The header examples of detail.ts, one test each.
describe("areaShown", () => {
  it("keeps an area that adds something", () => {
    expect(areaShown("Savaya", "Uluwatu", "Bali")).toBe("Uluwatu");
  });

  it("drops an area that only repeats the destination", () => {
    expect(areaShown("Lost Jungle", "Koh Phangan", "Koh Phangan")).toBeUndefined();
  });
});

describe("placeLine", () => {
  it("joins venue, area and destination", () => {
    expect(placeLine("Savaya", "Uluwatu", "Bali")).toBe("Savaya · Uluwatu, Bali");
  });

  it("leaves out an area the venue's name already holds", () => {
    expect(placeLine("Full Moon Party, Haad Rin Beach", "Haad Rin", "Koh Phangan")).toBe("Full Moon Party, Haad Rin Beach · Koh Phangan");
  });
});

describe("eventLink", () => {
  it("opens an https address", () => {
    const href = "https://www.savaya.com/event-calendar/february-13-2027";
    expect(eventLink(href)).toEqual({ kind: "page", href });
  });

  it("shows an http address as text", () => {
    expect(eventLink("http://example.com/party")).toEqual({ kind: "text", text: "http://example.com/party" });
  });
});

describe("whenLine", () => {
  it("names a dated show's day with its year", () => {
    expect(whenLine({ date: "2027-02-13" })).toBe("Sat 13 Feb 2027");
  });

  it("names a weekly show's day and first night", () => {
    expect(whenLine({ date: "2027-02-07", weekly: "sun" })).toBe("Every Sunday from 7 Feb");
  });
});

describe("placeOf", () => {
  const savaya = { name: "Savaya", destination: "bali", areaId: "uluwatu", lat: -8.8, lng: 115.1, line: "Club on the cliffs" };

  it("finds a trip venue by name", () => {
    expect(placeOf({ destination: "bali", venue: " SAVAYA" }, { venues: { savaya } })).toEqual({
      kind: "venue",
      id: "savaya",
      areaId: "uluwatu",
      line: "Club on the cliffs",
    });
  });

  it("falls back to a place a friend put on the map", () => {
    const custom = { p1: { name: "Kai's villa", kind: "stay", destination: "bali", lat: -8.6, lng: 115.1, addedBy: "ka", at: 1 } };
    expect(placeOf({ destination: "bali", venue: "Kai's villa" }, { venues: { savaya }, custom })).toEqual({ kind: "custom", id: "p1" });
  });
});
