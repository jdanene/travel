import { describe, expect, it } from "vitest";
import type { Show, Venue } from "../../../types/trip";
import { bigVenues, eventsList, shownUnder } from "./big";

const venues: Record<string, Venue> = {
  savaya: { name: "Savaya", destination: "bali", lat: 0, lng: 0, big: true },
  "mrs-sippy": { name: "Mrs Sippy", destination: "bali", lat: 0, lng: 0 },
  "ulu-cliffhouse": { name: "Ulu Cliffhouse", destination: "bali", lat: 0, lng: 0 },
};
const big = bigVenues(venues);
const known = Object.values(venues).map(({ name, destination }) => ({ name, destination }));
const show = (venue: string, source: Show["source"], artist = "DJ"): Show => ({ destination: "bali", venue, date: "2027-02-13", artist, verified: false, source, at: 0 });

// The header examples of shownUnder(), one test each.
describe("shownUnder", () => {
  it("shows a big venue's show under Big nights", () => {
    expect(shownUnder("big", show("Savaya", "seed"), big)).toBe(true);
  });

  it("hides a show at a venue that is not big", () => {
    expect(shownUnder("big", show("Mrs Sippy", "seed"), big)).toBe(false);
  });

  it("still shows a friend's event at a venue that is not big", () => {
    expect(shownUnder("big", show("Mrs Sippy", "friend"), big)).toBe(true);
  });

  it("shows everything under All", () => {
    expect(shownUnder("all", show("Mrs Sippy", "seed"), big)).toBe(true);
  });

  it("shows everything when the trip has no big venue at all", () => {
    expect(shownUnder("big", show("Mrs Sippy", "seed"), new Set())).toBe(true);
  });
});

// The header examples of eventsList().
describe("eventsList", () => {
  it("takes out the venues with nothing to show, and keeps a big venue with nothing announced", () => {
    const shows = { a: show("Mrs Sippy", "seed"), b: show("Ulu Cliffhouse", "seed") };
    expect(eventsList(shows, known, "big", big).map((group) => group.venues.map((venue) => venue.name))).toEqual([["Savaya"]]);
  });

  it("keeps a small venue for a friend's event, with that event alone", () => {
    const shows = { seeded: show("Mrs Sippy", "seed", "Pool Party"), mine: show("Mrs Sippy", "friend", "Kai's night") };
    const [bali] = eventsList(shows, known, "big", big);
    expect(bali.venues.map((venue) => [venue.name, venue.shows.map((one) => one.artist)])).toEqual([
      ["Mrs Sippy", ["Kai's night"]],
      ["Savaya", []],
    ]);
  });
});
