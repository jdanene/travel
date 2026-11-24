import { describe, expect, it } from "vitest";
import { passIsFresh } from "./splash";

// The header examples of passIsFresh(), one test each.
const now = Date.UTC(2026, 10, 23, 21, 0);

describe("passIsFresh", () => {
  it("lets in a load right after the splash's button", () => {
    expect(passIsFresh(String(now - 2_000), now)).toBe(true);
  });

  it("refuses a pass the tab never spent, two minutes later", () => {
    expect(passIsFresh(String(now - 120_000), now)).toBe(false);
  });

  it("sends a load with no pass to the splash", () => {
    expect(passIsFresh(null, now)).toBe(false);
  });
});
