import { describe, expect, it } from "vitest";
import { placeName } from "./place";

// The header examples of placeName().
describe("placeName", () => {
  it("adds the country", () => expect(placeName("Bali", "Indonesia")).toBe("Bali, Indonesia"));
  it("keeps the name alone with no country", () => expect(placeName("Bali")).toBe("Bali"));
  it("does not repeat a country the name already ends with", () => expect(placeName("Haad Khuat, Thailand", "Thailand")).toBe("Haad Khuat, Thailand"));
});
