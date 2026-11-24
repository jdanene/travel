import { describe, expect, it } from "vitest";
import { placeHits, type Box } from "./placeSearch";

// The header examples of placeHits(): the typical case and the surprising one.
const bali: Box = { lat: [-9.0, -8.0], lng: [114.4, 115.8] };
const hit = (name: string | undefined, lng: number, lat: number, district?: string) => ({
  geometry: { coordinates: [lng, lat] },
  properties: { name, district, osm_value: "bar" },
});

describe("placeHits", () => {
  it("keeps one Single Fin in Pecatu and hides the one in Australia", () =>
    expect(
      placeHits({ features: [hit("Single Fin", 115.0889, -8.815, "Pecatu"), hit("Single Fin", 115.0888, -8.8149, "Pecatu"), hit("Single Fin", 150.17, -35.84, "Broulee")] }, bali),
    ).toEqual([{ name: "Single Fin", area: "Pecatu", lat: -8.815, lng: 115.0889 }]));

  it("drops a result with no name", () => expect(placeHits({ features: [hit(undefined, 115.1, -8.6)] }, bali)).toEqual([]));
});
