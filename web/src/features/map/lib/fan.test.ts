import { describe, expect, it } from "vitest";
import { groupLabel, groupPins } from "./fan";

// The header examples of groupLabel(), one test each.
const names = [
  { id: "bali", name: "Bali" },
  { id: "kohPhangan", name: "Koh Phangan" },
  { id: "phuket", name: "Phuket" },
];
const totals = { bali: 12, kohPhangan: 8, phuket: 10 };
const many = (destination: string, count: number) => Array.from({ length: count }, () => destination);

describe("groupLabel", () => {
  it("names a whole destination", () => {
    expect(groupLabel(many("bali", 12), totals, names)).toBe("12 in Bali");
  });

  it("counts part of a destination as pins", () => {
    expect(groupLabel(many("bali", 3), totals, names)).toBe("3 pins");
  });

  it("names two whole destinations that sit close", () => {
    expect(groupLabel([...many("phuket", 10), ...many("kohPhangan", 8)], totals, names)).toBe("18 in Koh Phangan & Phuket");
  });
});

// The header examples of groupPins(), one test each.
describe("groupPins", () => {
  const at = (gap: number) => [
    { id: "a", destination: "kohPhangan", x: 0, y: 0 },
    { id: "b", destination: "kohPhangan", x: 10, y: 5 },
    { id: "c", destination: "phuket", x: gap, y: 0 },
  ];

  it("merges two destinations close on screen whole", () => {
    expect(groupPins(at(40)).map((group) => group.ids)).toEqual([["a", "b", "c"]]);
  });

  it("keeps destinations apart when they do not collide", () => {
    expect(groupPins(at(400)).map((group) => group.ids)).toEqual([["a", "b"], ["c"]]);
  });
});
