import { describe, expect, it } from "vitest";
import { readRoute } from "./route";

// The header examples of readRoute().
describe("readRoute", () => {
  it("opens the trip page", () => {
    expect(readRoute("/trip/abc")).toEqual({ page: "trip", tripId: "abc" });
  });

  it("opens every event, with a trailing slash", () => {
    expect(readRoute("/trip/abc/events/")).toEqual({ page: "events", tripId: "abc" });
  });

  it("opens one event", () => {
    expect(readRoute("/trip/abc/events/bali_2027-02-13_savaya_peggy-gou")).toEqual({
      page: "event",
      tripId: "abc",
      showId: "bali_2027-02-13_savaya_peggy-gou",
    });
  });

  it("opens nothing for an event id that does not decode", () => {
    expect(readRoute("/trip/abc/events/%E0%A4%A")).toBeNull();
  });

  it("opens every event when words were glued on after a space", () => {
    expect(readRoute("/trip/abc/events%20Bali%20%C2%B7%20Koh%20Phangan")).toEqual({ page: "events", tripId: "abc" });
  });

  it("opens nothing for a trip id with other characters", () => {
    expect(readRoute("/trip/a%2Fb")).toBeNull();
  });
});
