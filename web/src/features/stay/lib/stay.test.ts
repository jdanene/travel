import { describe, expect, it } from "vitest";
import { stayId } from "./stay";

// The header examples of stayId: the typical case and the surprising one.
describe("stayId", () => {
  it("drops the query string", () => {
    expect(stayId("https://www.airbnb.com/rooms/12345?check_in=2027-02-13&adults=8")).toBe("airbnb-rooms-12345");
  });

  it("gives one id for the same listing on a country domain", () => {
    expect(stayId("https://www.airbnb.co.uk/rooms/12345")).toBe(stayId("https://airbnb.com/rooms/12345"));
  });
});
