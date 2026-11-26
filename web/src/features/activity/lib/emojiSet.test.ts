import { describe, expect, it } from "vitest";
import { FIRST_SCREEN_CELLS, groupEmoji, warmOrder } from "./emojiSet";

describe("groupEmoji", () => {
  it("puts each group's emoji in Unicode's order", () => {
    const groups = groupEmoji(
      [
        { emoji: "😃", annotation: "grinning face with big eyes", group: 0, order: 2, version: 1 },
        { emoji: "😀", annotation: "grinning face", group: 0, order: 1, version: 1 },
      ],
      [0],
      15,
    );
    expect(groups.get(0)).toEqual([
      { char: "😀", name: "grinning face" },
      { char: "😃", name: "grinning face with big eyes" },
    ]);
  });

  it("leaves out emoji newer than the pictures, and keeps empty groups", () => {
    const groups = groupEmoji([{ emoji: "🫨", annotation: "shaking face", group: 0, order: 9, version: 15.1 }], [0, 1], 15);
    expect([...groups]).toEqual([
      [0, []],
      [1, []],
    ]);
  });
});

describe("warmOrder", () => {
  it("fetches the first screen first, then the rest top to bottom", () => {
    const smileys = Array.from({ length: FIRST_SCREEN_CELLS + 2 }, (_, at) => String.fromCodePoint(0x1f600 + at));
    const { first, rest } = warmOrder(["👍"], ["😀"], [smileys, ["👋"]]);
    expect(first).toEqual(["👍", ...smileys.slice(0, FIRST_SCREEN_CELLS)]);
    expect(rest).toEqual([...smileys.slice(FIRST_SCREEN_CELLS), "👋"]);
  });

  it("lists each emoji once", () => {
    expect(warmOrder(["😀"], ["😀"], [["😀"]])).toEqual({ first: ["😀"], rest: [] });
  });
});
