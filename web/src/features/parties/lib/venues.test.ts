import { describe, expect, it } from "vitest";
import { venueSuggestions, type VenueSpot } from "./venues";

// The header examples of venueSuggestions(): clubs first, then the search, then the typed words as a new venue.
const hit = (name: string) => ({ name, area: "Pecatu, Indonesia", lat: -8.8, lng: 115.1 });
const spot = (name: string, club: boolean): VenueSpot => ({ name, destination: "bali", club });
const savaya = spot("Savaya", true);
const singleFin = spot("Single Fin", true);
const villa = spot("Kai's villa", false);

describe("venueSuggestions", () => {
  it("lists every known venue, clubs first, when nothing is typed", () =>
    expect(venueSuggestions("", [singleFin, villa, savaya], [hit("Savaya Beach")]).map((line) => line.kind === "known" && line.venue.name)).toEqual([
      "Single Fin",
      "Savaya",
      "Kai's villa",
    ]));

  it("lists the known Savaya, the search without its copy, then the add line", () =>
    expect(venueSuggestions("sav", [savaya, singleFin], [hit("Savaya"), hit("Savaya Beach")])).toEqual([
      { kind: "known", venue: savaya },
      { kind: "place", hit: hit("Savaya Beach") },
      { kind: "new", name: "sav" },
    ]));

  it("still offers the add line when nothing matches", () => expect(venueSuggestions("zz", [savaya], [])).toEqual([{ kind: "new", name: "zz" }]));
});
