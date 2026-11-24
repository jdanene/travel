import { describe, expect, it } from "vitest";
import { insideDestination } from "./places";

// The header examples of insideDestination(): the typical case and the surprising one.
describe("insideDestination", () => {
  it("lets a spot in Canggu onto the Bali map", () => expect(insideDestination("bali", -8.64, 115.14)).toBe(true));
  it("refuses Koh Samui, the next island, on the Koh Phangan map", () => expect(insideDestination("kohPhangan", 9.53, 100.06)).toBe(false));
});
