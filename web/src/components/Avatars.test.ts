import { expect, test } from "vitest";
import { colourAt } from "./Avatars";

test("no two of the first forty friends share a colour", () => {
  const seen = new Set(Array.from({ length: 40 }, (_, at) => colourAt(at).background));
  expect(seen.size).toBe(40);
  expect(colourAt(0)).toEqual({ background: "#f0257e", color: "#fff" });
});
