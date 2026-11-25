import { describe, expect, it } from "vitest";
import { pins } from "./pins";

// The header examples of pins(), one test each.
const show = { destination: "bali", venue: "Savaya", date: "2027-02-13", artist: "Peggy Gou", verified: true, source: "seed" as const, at: 1 };
const venues = {
  savaya: { name: "Savaya", destination: "bali", lat: -8.84, lng: 115.1, line: "Club on the cliffs", big: true },
  klymax: { name: "Klymax", destination: "bali", lat: -8.7, lng: 115.17, big: true },
  "mrs-sippy": { name: "Mrs Sippy", destination: "bali", lat: -8.68, lng: 115.16 },
};
const areas = { uluwatu: { name: "Uluwatu", destination: "bali", lat: -8.83, lng: 115.09 } };
const villa = { destination: "bali", url: "https://www.airbnb.com/rooms/1", name: "Cliffside villa", area: "Uluwatu", addedBy: "ka", at: 1 };
const options = { o1: { from: "2027-02-13", to: "2027-02-23" } };

describe("pins", () => {
  it("pins the major clubs and the venues with an event, not a small venue with none", () => {
    const found = pins({ places: { venues }, parties: { shows: { s1: show } }, info: { destinations: { bali: { name: "Bali" } } } } as never);
    expect(found.map((pin) => [pin.id, pin.line])).toEqual([
      ["venue:savaya", "Club on the cliffs · next show Sat 13 Feb"],
      ["venue:klymax", "Bali · nothing announced yet"],
    ]);
  });

  it("pins a stay only once the dates are confirmed", () => {
    expect(pins({ dates: { options }, places: { areas }, stay: { options: { s1: villa } } })).toEqual([]);
    const settled = { options, confirmed: { optionId: "o1", by: "jd", at: 1 } };
    expect(pins({ dates: settled, places: { areas }, stay: { options: { s1: villa } } }).map((pin) => [pin.id, pin.lat])).toEqual([["stay:s1", -8.83]]);
  });

  it("pins a friend's place with no event anywhere", () => {
    const custom = { p1: { name: "Sunset bar", kind: "food" as const, destination: "bali", lat: -8.8, lng: 115.1, addedBy: "ka", at: 1 } };
    const found = pins({ crew: { members: { ka: { name: "Kai Adams" } } }, places: { custom } } as never);
    expect(found.map((pin) => [pin.id, pin.line])).toEqual([["place:p1", "Food · added by KA"]]);
  });
});
