import { describe, expect, it } from "vitest";
import { codepoints, groupReactions, readKey, reactionKey, splitEmotes, usableEmote, withEmoteTokens } from "./reactions";

// The header examples of reactions.ts.
const RAIN = { id: "01FCY771D800007PQ2DF3GDTN6", name: "RainTime" };

describe("reaction keys", () => {
  it("names an emoji as Twemoji names its file, and reads it back", () => {
    expect(codepoints("🔥")).toBe("1f525");
    expect(codepoints("❤️")).toBe("2764");
    expect(codepoints("#️⃣")).toBe("23-20e3");
    expect(codepoints("👩‍💻")).toBe("1f469-200d-1f4bb");
    expect(reactionKey({ kind: "emote", emote: RAIN })).toBe("7tv-01FCY771D800007PQ2DF3GDTN6-RainTime");
    expect(readKey("1f525")).toEqual({ kind: "emoji", char: "🔥" });
    expect(readKey("7tv-01FCY771D800007PQ2DF3GDTN6-RainTime")).toEqual({ kind: "emote", emote: RAIN });
  });

  it("refuses a key it did not write, and an emote name with a space", () => {
    expect(readKey("nope")).toBeNull();
    expect(usableEmote(RAIN)).toBe(true);
    expect(usableEmote({ ...RAIN, name: "two words" })).toBe(false);
  });
});

describe("groupReactions", () => {
  it("makes one pill per emoji in the order each was first added", () => {
    const pills = groupReactions({ ka: { "1f525": 2 }, rb: { "1f525": 3, "1f602": 1 } }, "rb");
    expect(pills.map((pill) => [pill.key, pill.who, pill.mine])).toEqual([
      ["1f602", ["rb"], true],
      ["1f525", ["ka", "rb"], true],
    ]);
    expect(groupReactions(undefined, "rb")).toEqual([]);
  });

  it("still reads the first version's one emoji per member", () => {
    expect(groupReactions({ ka: "🔥" }, "rb").map((pill) => [pill.key, pill.who, pill.mine])).toEqual([["1f525", ["ka"], false]]);
  });
});

describe("emotes in messages", () => {
  it("splits a message into words and emotes, and stores only picked names", () => {
    expect(splitEmotes("gm <:catJAM:01FCY771D800007PQ2DF3GDTN6>!")).toEqual([
      { kind: "text", text: "gm " },
      { kind: "emote", emote: { name: "catJAM", id: "01FCY771D800007PQ2DF3GDTN6" } },
      { kind: "text", text: "!" },
    ]);
    expect(withEmoteTokens("gm :catJAM:", { catJAM: RAIN.id })).toBe("gm <:catJAM:01FCY771D800007PQ2DF3GDTN6>");
    expect(withEmoteTokens("gm :nope:", {})).toBe("gm :nope:");
  });
});
