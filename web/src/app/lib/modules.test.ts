import { describe, expect, it } from "vitest";
import { modules } from "./modules";

// The header examples of modules() and allSet(), one test each.

describe("modules", () => {
  it("counts events on the Events button", () => {
    const show = { destination: "kohPhangan", venue: "Haad Rin Beach", date: "2027-02-22", artist: "Full Moon Party", verified: true, source: "seed" as const, at: 1 };
    expect(modules({ parties: { shows: { fmp: show } } }, "rb").find((module) => module.id === "parties")!.lines).toEqual(["1 event · I'm in"]);
  });
});
