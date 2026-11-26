import { describe, expect, it } from "vitest";
import type { Trip } from "../../../types/trip";
import { clubOf, httpsLink, mapsLink } from "./club";

// The header examples of club.ts, one test each.
const MAPS = "https://www.google.com/maps/search/?api=1&query=";

describe("httpsLink", () => {
  it("keeps an https address", () => {
    expect(httpsLink("https://www.savaya.com/")).toBe("https://www.savaya.com/");
  });

  it("refuses http, a script address and anything that is not text", () => {
    expect(httpsLink("http://savaya.com")).toBeNull();
    expect(httpsLink("javascript:alert(1)")).toBeNull();
    expect(httpsLink(42)).toBeNull();
  });
});

describe("mapsLink", () => {
  it("searches the club's name with its area and country", () => {
    expect(mapsLink("Savaya", "Uluwatu, Bali, Indonesia")).toBe(`${MAPS}Savaya%2C%20Uluwatu%2C%20Bali%2C%20Indonesia`);
  });

  it("encodes accented names", () => {
    expect(mapsLink("Café del Mar Bali", "Canggu, Bali, Indonesia")).toBe(`${MAPS}Caf%C3%A9%20del%20Mar%20Bali%2C%20Canggu%2C%20Bali%2C%20Indonesia`);
    expect(mapsLink("CÉ LA VI", "Marina Bay, Singapore")).toBe(`${MAPS}C%C3%89%20LA%20VI%2C%20Marina%20Bay%2C%20Singapore`);
  });
});

describe("clubOf", () => {
  const trip = {
    info: { destinations: { bali: { name: "Bali", country: "Indonesia" } } },
    places: {
      areas: { uluwatu: { name: "Uluwatu", destination: "bali", lat: 0, lng: 0 } },
      venues: {
        savaya: {
          name: "Savaya",
          destination: "bali",
          areaId: "uluwatu",
          lat: 0,
          lng: 0,
          line: "Club on the cliffs",
          photoUrl: "https://example.com/savaya.jpg",
          website: "https://www.savaya.com/",
          instagram: "https://www.instagram.com/savayabali/",
        },
      },
    },
  } as unknown as Pick<Trip, "info" | "places">;

  it("reads the trip's venue", () => {
    expect(clubOf({ destination: "bali", name: "Savaya" }, trip)).toEqual({
      name: "Savaya",
      where: "Uluwatu, Bali, Indonesia",
      line: "Club on the cliffs",
      photoUrl: "https://example.com/savaya.jpg",
      website: "https://www.savaya.com/",
      instagram: "https://www.instagram.com/savayabali/",
      maps: `${MAPS}Savaya%2C%20Uluwatu%2C%20Bali%2C%20Indonesia`,
    });
  });

  it("gives a venue the trip does not know its name, place and Google Maps only", () => {
    expect(clubOf({ destination: "bali", name: "Kai's villa" }, trip)).toEqual({
      name: "Kai's villa",
      where: "Bali, Indonesia",
      maps: `${MAPS}Kai's%20villa%2C%20Bali%2C%20Indonesia`,
    });
  });
});
