import { describe, expect, it } from "vitest";
import type { Show, Trip, Venue } from "../../../types/trip";
import { eventShown, eventsList, pickFilter, tagChips, tagSlug, tripTags, venueShown } from "./tags";

const venues: Record<string, Venue> = {
  savaya: { name: "Savaya", destination: "bali", lat: 0, lng: 0, big: true },
  klymax: { name: "Klymax", destination: "bali", lat: 0, lng: 0, big: true },
  "mrs-sippy": { name: "Mrs Sippy", destination: "bali", lat: 0, lng: 0 },
};
const show = (venue: string, source: Show["source"], artist = "DJ"): Show => ({ destination: "bali", venue, date: "2027-02-13", artist, verified: false, source, at: 0 });
const shows = { k1: show("Klymax", "seed"), m1: show("Mrs Sippy", "seed") };
const trip: Pick<Trip, "parties" | "places"> = { parties: { shows, showTags: { k1: { big: true } } }, places: { venues, tagNames: { rooftop: "Rooftop" } } };
const tags = tripTags(trip);
const known = Object.values(venues).map(({ name, destination }) => ({ name, destination }));

describe("tripTags", () => {
  it("reads parties/showTags by event and names Big nights", () => {
    expect([...tags.byShow.k1]).toEqual(["big"]);
    expect(tags.names.big).toBe("Big nights");
  });

  it("keeps only the big venues with no event this season", () => {
    expect([...tags.bigVenues]).toEqual(["bali_savaya"]);
  });
});

describe("tagChips", () => {
  it("lists a made tag with no event yet, after Big nights", () => {
    expect(tagChips(tags).map((chip) => chip.name)).toEqual(["Big nights", "Rooftop"]);
  });

  it("has no chip when no tag is made, none is on an event and no big venue waits", () => {
    expect(tagChips(tripTags({ parties: { shows }, places: { venues: { "mrs-sippy": venues["mrs-sippy"] } } }))).toEqual([]);
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

// The header examples of the tag resolution.
describe("eventShown", () => {
  it("shows a tagged event under its tag", () => {
    expect(eventShown("big", "k1", shows.k1, tags)).toBe(true);
  });

  it("hides an untagged event under a tag", () => {
    expect(eventShown("big", "m1", shows.m1, tags)).toBe(false);
  });

  it("still shows a friend's event with no tags", () => {
    expect(eventShown("big", "f1", show("Mrs Sippy", "friend"), tags)).toBe(true);
  });

  it("shows every event under All", () => {
    expect(eventShown("all", "m1", shows.m1, tags)).toBe(true);
  });
});

describe("venueShown", () => {
  it("keeps a big venue with only last season under Big nights", () => {
    expect(venueShown("big", { destination: "bali", venue: "Savaya" }, tags)).toBe(true);
  });

  it("keeps it under no other tag", () => {
    expect(venueShown("rooftop", { destination: "bali", venue: "Savaya" }, tags)).toBe(false);
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
  it("takes out the venues with nothing to show, and keeps a big venue with nothing announced", () => {
    const list = eventsList({ m1: shows.m1 }, known, "big", tripTags({ ...trip, parties: { shows: { m1: shows.m1 } } }));
    expect(list.map((group) => group.venues.map((venue) => venue.name))).toEqual([["Klymax", "Savaya"]]);
  });

  it("keeps a venue for a friend's event, with that event alone", () => {
    const both = { m1: show("Mrs Sippy", "seed", "Pool Party"), mine: show("Mrs Sippy", "friend", "Kai's night") };
    const [bali] = eventsList(both, known, "big", tripTags({ ...trip, parties: { shows: both } }));
    expect(bali.venues.map((venue) => [venue.name, venue.shows.map((one) => one.artist)])).toEqual([
      ["Mrs Sippy", ["Kai's night"]],
      ["Klymax", []],
      ["Savaya", []],
    ]);
  });
});
