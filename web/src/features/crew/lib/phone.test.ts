import { describe, expect, it } from "vitest";
import { showPhone, toE164 } from "./phone";

// The header examples of toE164 and showPhone (fictional numbers).
describe("toE164", () => {
  it("puts +1 before a US number typed with brackets and dashes", () => {
    expect(toE164("1", "(415) 555-0123")).toBe("+14155550123");
    expect(toE164("1", "1 415 555 0123")).toBe("+14155550123");
  });

  it("drops the trunk 0 of another country", () => {
    expect(toE164("44", "07700 900123")).toBe("+447700900123");
  });

  it("lets a typed + win over the picker", () => {
    expect(toE164("1", "+62 812 3456 7890")).toBe("+6281234567890");
  });

  it("refuses seven digits as a US number", () => {
    expect(toE164("1", "555-0123")).toBeNull();
  });
});

describe("showPhone", () => {
  it("writes +1 numbers in the US form and others as they are", () => {
    expect(showPhone("+14155550123")).toBe("+1 (415) 555-0123");
    expect(showPhone("+447700900123")).toBe("+447700900123");
  });
});
