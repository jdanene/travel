import { describe, expect, it } from "vitest";
import { eventsLink } from "./share";

// The header examples of eventsLink().
describe("eventsLink", () => {
  it("makes the link to every event of the trip", () => {
    expect(eventsLink("https://travel-ca8f9.web.app", "abc")).toBe("https://travel-ca8f9.web.app/trip/abc/events");
  });

  it("makes the link to one event", () => {
    expect(eventsLink("http://localhost:5192", "abc", "bali_2027-02-13_savaya_peggy-gou")).toBe(
      "http://localhost:5192/trip/abc/events/bali_2027-02-13_savaya_peggy-gou",
    );
  });

  it("encodes an odd id, so it stays one path part", () => {
    expect(eventsLink("https://x.app", "abc", "a b/c")).toBe("https://x.app/trip/abc/events/a%20b%2Fc");
  });
});
