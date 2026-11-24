import { describe, expect, it } from "vitest";
import { stayLength } from "./format";

describe("stayLength", () => {
  it("gives nights and weeks to the nearest half", () => {
    expect(stayLength(10)).toBe("10\u00a0nights · 1.5\u00a0weeks");
    expect(stayLength(7)).toBe("7\u00a0nights · 1\u00a0week");
    expect(stayLength(3)).toBe("3\u00a0nights");
  });
});
