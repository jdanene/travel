import { describe, expect, it } from "vitest";
import type { Places, Show, Venue } from "../../../types/trip";
import { eventsList, pickFilter, shownUnder, tagChips, tagSlug, tripTags } from "./tags";

const venues: Record<string, Venue> = {
  savaya: { name: "Savaya", destination: "bali", lat: 0, lng: 0, big: true },
  klymax: { name: "Klymax", destination: "bali", lat: 0, lng: 0 },
  "mrs-sippy": { name: "Mrs Sippy", destination: "bali", lat: 0, lng: 0 },
};
const places: Places = { venues, tags: { savaya: { big: true } }, tagNames: { big: "Big nights", rooftop: "Rooftop" } };
const tags = tripTags(places);
const known = Object.values(venues).map(({ name, destination }) => ({ name, destination }));
const show = (venue: string, source: Show["source"], artist = "DJ"): Show => ({ destination: "bali", venue, date: "2027-02-13", artist, verified: false, source, at: 0 });

describe("tripTags", () => {
  it("reads places/tags by venue", () => {
    expect([...tags.byVenue.entries()].map(([key, set]) => [key, [...set]])).toEqual([["bali_savaya", ["big"]]]);
  });

  it("reads the big flags as Big nights before the trip has tags", () => {
    const old = tripTags({ venues });
    expect([...(old.byVenue.get("bali_savaya") ?? [])]).toEqual(["big"]);
    expect(old.names).toEqual({ big: "Big nights" });
  });
});

describe("tagChips", () => {
  it("puts Big nights first, then the rest by name", () => {
    const more = tripTags({ ...places, tags: { savaya: { big: true, rooftop: true }, klymax: { big: true } } });
    expect(tagChips(more).map((chip) => chip.name)).toEqual(["Big nights", "Rooftop"]);
  });

  it("has no chip when no venue is tagged", () => {
    expect(tagChips(tripTags({ venues, tagNames: { big: "Big nights" } }))).toEqual([]);
  });
});

describe("pickFilter", () => {
  it("opens on Big nights with nothing stored", () => {
    expect(pickFilter(null, tagChips(tags))).toBe("big");
  });

  it("falls back to All when the stored tag is gone and there is no Big nights", () => {
    expect(pickFilter("rooftop", [])).toBe("all");
  });
});

// The header examples of the Events filter with tags.
describe("shownUnder", () => {
  it("shows a tagged venue's show under its tag (the default)", () => {
    expect(shownUnder("big", show("Savaya", "seed"), tags)).toBe(true);
  });

  it("hides it under another tag", () => {
    expect(shownUnder("rooftop", show("Savaya", "seed"), tags)).toBe(false);
  });

  it("shows everything under All", () => {
    expect(shownUnder("all", show("Mrs Sippy", "seed"), tags)).toBe(true);
  });

  it("still shows a friend's event at an untagged venue", () => {
    expect(shownUnder("big", show("Mrs Sippy", "friend"), tags)).toBe(true);
  });
});

describe("tagSlug", () => {
  it("makes a slug from a name", () => {
    expect(tagSlug(" Rooftop ")).toBe("rooftop");
  });

  it("cuts a long name to 24 characters", () => {
    expect(tagSlug("The very best sunset rooftops of Bali")).toBe("the-very-best-sunset-roo");
  });
});

describe("eventsList", () => {
  it("takes out the venues with nothing to show, and keeps a tagged venue with nothing announced", () => {
    const shows = { a: show("Mrs Sippy", "seed"), b: show("Klymax", "seed") };
    expect(eventsList(shows, known, "big", tags).map((group) => group.venues.map((venue) => venue.name))).toEqual([["Savaya"]]);
  });

  it("keeps an untagged venue for a friend's event, with that event alone", () => {
    const shows = { seeded: show("Mrs Sippy", "seed", "Pool Party"), mine: show("Mrs Sippy", "friend", "Kai's night") };
    const [bali] = eventsList(shows, known, "big", tags);
    expect(bali.venues.map((venue) => [venue.name, venue.shows.map((one) => one.artist)])).toEqual([
      ["Mrs Sippy", ["Kai's night"]],
      ["Savaya", []],
    ]);
  });
});
