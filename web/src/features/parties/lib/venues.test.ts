import { describe, expect, it } from "vitest";
import { venueSuggestions } from "./venues";

// The header examples of venueSuggestions(): known places first, then the search, no duplicates.
const hit = (name: string) => ({ name, area: "Pecatu, Indonesia", lat: -8.8, lng: 115.1 });

describe("venueSuggestions", () => {
  it("lists the known Savaya first and leaves out the search's copy of it", () =>
    expect(venueSuggestions("sav", ["Savaya", "Single Fin"], [hit("Savaya"), hit("Savaya Beach")])).toEqual([
      { kind: "known", name: "Savaya" },
      { kind: "place", hit: hit("Savaya Beach") },
    ]));

  it("lists every known place when nothing is typed", () =>
    expect(venueSuggestions("", ["Savaya", "Single Fin"], [])).toEqual([
      { kind: "known", name: "Savaya" },
      { kind: "known", name: "Single Fin" },
    ]));
});
