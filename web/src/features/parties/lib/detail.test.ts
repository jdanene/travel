import { describe, expect, it } from "vitest";
import { areaLine, areaShown, eventLink, placeLine, placeOf, showPlace, showTimes, timeLine, whenLine } from "./detail";

// The header examples of detail.ts, one test each.
describe("areaShown", () => {
  it("keeps an area that adds something", () => {
    expect(areaShown("Savaya", "Uluwatu", "Bali")).toBe("Uluwatu");
  });

  it("drops an area that only repeats the destination", () => {
    expect(areaShown("Lost Jungle", "Koh Phangan", "Koh Phangan")).toBeUndefined();
    expect(areaShown("Lost Jungle", "Koh Phangan", "Koh Phangan, Thailand")).toBeUndefined();
  });
});

describe("placeLine", () => {
  it("joins venue, area and destination", () => {
    expect(placeLine("Savaya", "Uluwatu", "Bali, Indonesia")).toBe("Savaya · Uluwatu, Bali, Indonesia");
  });

  it("leaves out an area the venue's name already holds", () => {
    expect(placeLine("Full Moon Party, Haad Rin Beach", "Haad Rin", "Koh Phangan, Thailand")).toBe("Full Moon Party, Haad Rin Beach · Koh Phangan, Thailand");
  });

  it("lets a searched area with its country stand alone", () => {
    expect(placeLine("Bottle Beach 1", "Haad Khuat, Thailand", "Koh Phangan, Thailand")).toBe("Bottle Beach 1 · Haad Khuat, Thailand");
  });
});

describe("areaLine", () => {
  it("names the area, then the destination with its country", () => {
    expect(areaLine("Savaya", "Uluwatu", "Bali, Indonesia")).toBe("Uluwatu, Bali, Indonesia");
  });

  it("is the destination alone for a venue with no area", () => {
    expect(areaLine("Lost Jungle", undefined, "Koh Phangan, Thailand")).toBe("Koh Phangan, Thailand");
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

describe("timeLine", () => {
  it("says a night's start and end, past midnight, in the 12-hour style", () => {
    expect(timeLine({ startTime: "22:00", endTime: "04:00" })).toBe("10 pm – 4 am");
    expect(timeLine({ startTime: "22:30" })).toBe("From 10:30 pm");
  });

  it("says nothing with no start, or with a time in another shape", () => {
    expect(timeLine({})).toBeNull();
    expect(timeLine({ endTime: "04:00" })).toBeNull();
    expect(timeLine({ startTime: "10pm" })).toBeNull();
  });

  it("names noon and midnight", () => {
    expect(timeLine({ startTime: "12:00", endTime: "00:00" })).toBe("12 pm – 12 am");
  });
});

describe("showTimes", () => {
  it("keeps a start and an end in HH:MM", () => {
    expect(showTimes("22:00", "04:00")).toEqual({ startTime: "22:00", endTime: "04:00" });
  });

  it("drops an end with no start, an end equal to the start, and any other shape", () => {
    expect(showTimes(undefined, "04:00")).toEqual({});
    expect(showTimes("22:00", "22:00")).toEqual({ startTime: "22:00" });
    expect(showTimes("24:00", 4)).toEqual({});
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

describe("showPlace", () => {
  const trip = {
    info: { destinations: { bali: { name: "Bali", country: "Indonesia" } } },
    places: {
      areas: { uluwatu: { name: "Uluwatu", destination: "bali" } },
      venues: { savaya: { name: "Savaya", destination: "bali", areaId: "uluwatu", lat: -8.8, lng: 115.1, line: "Club on the cliffs", photoUrl: "https://example.com/savaya.jpg" } },
    },
  } as unknown as Parameters<typeof showPlace>[1];

  it("names a known venue with its area, country, line and picture", () => {
    expect(showPlace({ destination: "bali", venue: "Savaya" }, trip)).toEqual({
      where: "Savaya · Uluwatu, Bali, Indonesia",
      line: "Club on the cliffs",
      photoUrl: "https://example.com/savaya.jpg",
    });
  });

  it("gives a friend's venue the trip does not know its place line alone", () => {
    expect(showPlace({ destination: "bali", venue: "Kai's villa" }, trip)).toEqual({ where: "Kai's villa · Bali, Indonesia" });
  });
});
