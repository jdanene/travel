import { describe, expect, it } from "vitest";
import type { ActivityEntry, ActivityKind } from "../../../types/trip";
import { lineWords, readyDraft, tally } from "./lines";

// The header examples of lineWords() and tally(), in mock 5's words.
const line = (kind: ActivityKind, text?: string): ActivityEntry => ({ kind, at: 1, ...(text ? { text } : {}) });

describe("lineWords", () => {
  it("says each kind in the mock's words", () => {
    const said = (entry: ActivityEntry, name: string) => {
      const { lead, rest } = lineWords(entry, name);
      return `${lead} ${rest}`;
    };
    expect(said(line("joined"), "RJ")).toBe("RJ joined");
    expect(said(line("reply-changed", "maybe"), "SN")).toBe("SN said maybe");
    expect(said(line("reply-changed", "out"), "AJ")).toBe("AJ can't make it");
    expect(said(line("dates-added", "18–24 Feb"), "KA")).toBe("KA added dates: 18–24 Feb");
    expect(said(line("dates-confirmed", "13–23 Feb"), "Dom")).toBe("Dom confirmed the dates: 13–23 Feb");
    expect(said(line("dates-changed"), "Dom")).toBe("Dom changed the dates");
    expect(said(line("stay-added", "Cliffside villa"), "KA")).toBe("KA added a place: Cliffside villa");
    expect(said(line("stay-confirmed", "Cliffside villa"), "Dom")).toBe("Dom confirmed the stay: Cliffside villa");
    expect(said(line("event-added", "Boat party at Bottle Beach"), "KA")).toBe("KA added an event: Boat party at Bottle Beach");
    expect(said(line("event-in", "Peggy Gou at Savaya"), "TO")).toBe("TO is in for Peggy Gou at Savaya");
    expect(said(line("link-added", "TikTok"), "LC")).toBe("LC added a link: TikTok");
    expect(said(line("place-added", "Sunset bar"), "RJ")).toBe("RJ added to the map: Sunset bar");
    expect(said(line("event-found", "Zamna at Phuket, 29 Jan"), "")).toBe("New event found: Zamna at Phuket, 29 Jan");
    expect(said(line("post"), "TO")).toBe("TO posted");
    expect(said(line("poll"), "TO")).toBe("TO asked");
  });

  it("drops the colon part when a line has no text", () => {
    expect(lineWords(line("stay-added"), "KA")).toEqual({ lead: "KA", rest: "added a place" });
  });
});

describe("tally", () => {
  it("counts each member once, for the option stored now", () => {
    const { options, voted } = tally(["Yes", "No"], { to: 0, ka: 0, mb: 0, rj: 0, lc: 1 });
    expect(voted).toBe(5);
    expect(options).toEqual([
      { label: "Yes", voters: ["ka", "mb", "rj", "to"], share: 0.8 },
      { label: "No", voters: ["lc"], share: 0.2 },
    ]);
  });

  it("has no shares before the first vote", () => {
    expect(tally(["Villa", "Hotel"], undefined)).toEqual({
      voted: 0,
      options: [
        { label: "Villa", voters: [], share: 0 },
        { label: "Hotel", voters: [], share: 0 },
      ],
    });
  });

  it("counts a vote for an option the poll does not have for nothing", () => {
    expect(tally(["Yes", "No"], { ka: 0, rb: 3 })).toEqual({
      voted: 1,
      options: [
        { label: "Yes", voters: ["ka"], share: 1 },
        { label: "No", voters: [], share: 0 },
      ],
    });
  });
});

describe("readyDraft", () => {
  it("trims a message and drops empty poll options", () => {
    expect(readyDraft({ text: "  Hi " })).toEqual({ text: "Hi" });
    expect(readyDraft({ text: "Villa or hotel?", options: ["Villa", "", "Hotel"] })).toEqual({ text: "Villa or hotel?", options: ["Villa", "Hotel"] });
  });

  it("refuses a poll with one option", () => {
    expect(readyDraft({ text: "Villa?", options: ["Villa", ""] })).toBeNull();
  });
});
