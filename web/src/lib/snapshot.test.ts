import { describe, expect, it } from "vitest";
import { freshSnapshot } from "./snapshot";

// The header examples of freshSnapshot(), one test each.
const now = Date.UTC(2026, 10, 24, 21, 0);
const saved = (tripId: string, ago: number) => JSON.stringify({ at: now - ago, tripId, uid: "u1", trip: { info: {} } });

describe("freshSnapshot", () => {
  it("draws the first paint from a snapshot saved 30 seconds ago for this trip", () => {
    expect(freshSnapshot(saved("abc", 30_000), "abc", now)?.uid).toBe("u1");
  });

  it("ignores a snapshot 6 minutes old", () => {
    expect(freshSnapshot(saved("abc", 360_000), "abc", now)).toBeNull();
  });

  it("ignores a snapshot of another trip", () => {
    expect(freshSnapshot(saved("xyz", 30_000), "abc", now)).toBeNull();
  });

  it("ignores no snapshot, and text that is not one", () => {
    expect(freshSnapshot(null, "abc", now)).toBeNull();
    expect(freshSnapshot("{oops", "abc", now)).toBeNull();
  });
});
