import { describe, expect, it } from "vitest";
import type { Crew, Member } from "../../types/trip";
import { nudgeFor } from "./nudge";

const friend = (reply: Member["reply"]): Member => ({ name: "X", reply, at: 1 });
const five: Crew = { members: { a: friend("in"), b: friend("in"), c: friend("in"), d: friend("in"), e: friend("in"), f: friend("maybe") } };

// The header examples of nudgeFor().
describe("nudgeFor", () => {
  it("invites a new device and counts who is in", () => {
    expect(nudgeFor(five, "visitor")).toEqual({ title: "You're invited", line: "5 are in so far", action: "Join the trip" });
  });

  it("leaves the small line out with nobody in yet", () => {
    expect(nudgeFor({ members: { f: friend("maybe") } }, "visitor")).toEqual({ title: "You're invited", line: null, action: "Join the trip" });
  });

  it("opens the trip for a device that joined with I'm in", () => {
    expect(nudgeFor({ members: { a: friend("in") }, devices: { u1: "a" } }, "u1")).toEqual({ title: "You're in this trip", line: "1 is in so far", action: "Open the trip" });
  });

  it("says only that a maybe has replied", () => {
    expect(nudgeFor({ ...five, devices: { u1: "f" } }, "u1").title).toBe("You've replied");
  });

  it("treats a device with no member record as not joined", () => {
    expect(nudgeFor({ devices: { u1: "gone" } }, "u1").action).toBe("Join the trip");
  });
});
