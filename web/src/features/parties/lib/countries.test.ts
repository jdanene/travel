import { describe, expect, it } from "vitest";
import { countryChips, inCountry, pickCountry } from "./countries";

const destinations = {
  bali: { name: "Bali", country: "Indonesia" },
  kohPhangan: { name: "Koh Phangan", country: "Thailand" },
  phuket: { name: "Phuket", country: "Thailand" },
  singapore: { name: "Singapore", country: "Singapore" },
  kohSamui: { name: "Koh Samui", country: "Thailand" },
  old: { name: "Old" },
};

describe("countryChips", () => {
  it("lists each country once, in the order of the trip's destinations", () => {
    const listed = [{ destination: "phuket" }, { destination: "singapore" }, { destination: "bali" }, { destination: "kohPhangan" }, { destination: "kohSamui" }];
    expect(countryChips(destinations, listed)).toEqual(["Indonesia", "Thailand", "Singapore"]);
  });

  it("makes no chip for a destination with no country or one the trip lacks", () => {
    expect(countryChips(destinations, [{ destination: "old" }, { destination: "gone" }, { destination: "bali" }])).toEqual(["Indonesia"]);
  });
});

describe("pickCountry", () => {
  it("keeps a stored country while it is a chip", () => {
    expect(pickCountry("Thailand", ["Indonesia", "Thailand"])).toBe("Thailand");
  });

  it("falls back to all when the country is gone, or is the only one", () => {
    expect(pickCountry("Australia", ["Indonesia", "Thailand"])).toBe("all");
    expect(pickCountry("Thailand", ["Thailand"])).toBe("all");
  });
});

describe("inCountry", () => {
  it("keeps a destination in the picked country and every one under all", () => {
    expect(inCountry("Thailand", destinations, "phuket")).toBe(true);
    expect(inCountry("Thailand", destinations, "gone")).toBe(false);
    expect(inCountry("all", destinations, "gone")).toBe(true);
  });
});
