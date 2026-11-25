import { describe, expect, it } from "vitest";
import { matchRank, nearestDestination, orderHits, placeHits } from "./placeSearch";

// The header examples of placeSearch.ts: each typical case and its surprising one.
const hit = (props: Record<string, unknown>, lng: number, lat: number) => ({ geometry: { coordinates: [lng, lat] }, properties: { osm_value: "bar", ...props } });

describe("placeHits", () => {
  it("keeps one Single Fin in Pecatu", () =>
    expect(
      placeHits({
        features: [
          hit({ name: "Single Fin", district: "Pecatu", country: "Indonesia" }, 115.0889, -8.815),
          hit({ name: "Single Fin", district: "Pecatu", country: "Indonesia" }, 115.0888, -8.8149),
        ],
      }),
    ).toEqual([{ name: "Single Fin", area: "Pecatu, Indonesia", lat: -8.815, lng: 115.0889 }]));

  it("names a nameless result by its address", () =>
    expect(placeHits({ features: [hit({ housenumber: "313", street: "Orchard Road", district: "Orchard", country: "Singapore" }, 103.838, 1.301)] })[0].name).toBe(
      "313 Orchard Road",
    ));
});

describe("matchRank", () => {
  it("ranks the same words first", () => expect(matchRank("Single Fin", "single fin")).toBe(0));
  it("ranks a name that starts with the words next", () => expect(matchRank("Single Fin Bali", "single f")).toBe(1));
  it("ranks words that start the name's words in any order", () => expect(matchRank("The Single Fin", "fin sing")).toBe(2));
  it("ranks a name without the words last", () => expect(matchRank("Starbucks", "313 orchard")).toBe(4));
});

describe("orderHits", () => {
  const bali = { lat: -8.45572, lng: 115.27043 };
  it("puts the Single Fin near Bali before the one in Australia", () =>
    expect(
      orderHits(
        [
          { name: "Single Fin", area: "Broulee, Australia", lat: -35.84, lng: 150.17 },
          { name: "Single Fin", area: "Pecatu, Indonesia", lat: -8.815, lng: 115.0889 },
        ],
        "single fin",
        [bali],
      ).map((one) => one.area),
    ).toEqual(["Pecatu, Indonesia", "Broulee, Australia"]));
});

describe("nearestDestination", () => {
  const trip = [
    { id: "bali", lat: -8.45572, lng: 115.27043 },
    { id: "kohPhangan", lat: 9.73495, lng: 100.03057 },
    { id: "phuket", lat: 7.97908, lng: 98.33552 },
    { id: "singapore", lat: 1.28992, lng: 103.85191 },
    { id: "kohSamui", lat: 9.50139, lng: 99.99562 },
  ];
  it("groups Canggu under Bali", () => expect(nearestDestination(trip, { lat: -8.65, lng: 115.13 })).toBe("bali"));
  it("groups Chaweng under Koh Samui, not Koh Phangan 25 km north", () => expect(nearestDestination(trip, { lat: 9.5215, lng: 100.05863 })).toBe("kohSamui"));
  it("groups Bangkok, far from all five, under Koh Phangan", () => expect(nearestDestination(trip, { lat: 13.75, lng: 100.5 })).toBe("kohPhangan"));
});
