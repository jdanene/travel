import { describe, expect, it } from "vitest";
import { isShortLink, playerOf, readMessage } from "./players";

// The header examples of players.ts.
const player = (address: string) => playerOf(new URL(address));

describe("readMessage", () => {
  it("gives a message of one reel link the player alone", () => {
    const message = readMessage("https://www.instagram.com/reel/C6HpUPegvtc/?igsh=x");
    expect(message.video).toEqual({ site: "instagram", href: "https://www.instagram.com/reel/C6HpUPegvtc/?igsh=x", player: "https://www.instagram.com/reel/C6HpUPegvtc/embed/" });
    expect(message.linkOnly).toBe(true);
  });

  it("drops trailing punctuation, keeps other sites plain, and asks for a short link's id", () => {
    const message = readMessage("lol https://vm.tiktok.com/ZMkyTWLpV/!! and https://example.com");
    expect(message.pieces).toEqual([
      { kind: "text", text: "lol " },
      { kind: "link", href: "https://vm.tiktok.com/ZMkyTWLpV/", label: "vm.tiktok.com/ZMkyTWLpV" },
      { kind: "text", text: "!! and https://example.com" },
    ]);
    expect(message.video).toEqual({ site: "tiktok", href: "https://vm.tiktok.com/ZMkyTWLpV/", lookup: "https://vm.tiktok.com/ZMkyTWLpV/" });
    expect(message.linkOnly).toBe(false);
    expect(readMessage("https://www.instagram.com/savayabali/").video).toBeNull();
  });
});

describe("playerOf and isShortLink", () => {
  it("finds the post in every direct form", () => {
    expect(player("https://m.instagram.com/someone/reel/C6HpUPegvtc/")).toBe("https://www.instagram.com/reel/C6HpUPegvtc/embed/");
    expect(player("https://instagram.com/p/CgVLB1Dj3Ow")).toBe("https://www.instagram.com/p/CgVLB1Dj3Ow/embed/");
    expect(player("https://www.tiktok.com/@/video/7620909821147073813?_r=1")).toBe("https://www.tiktok.com/player/v1/7620909821147073813");
  });

  it("gives a story, a profile, a photo post and a short link no player", () => {
    expect(player("https://www.instagram.com/stories/savaya/1234567890/")).toBeNull();
    expect(player("https://www.tiktok.com/@savaya")).toBeNull();
    expect(player("https://www.tiktok.com/@charles.tibedo/photo/7647159449706040606")).toBeNull();
    expect(player("https://vt.tiktok.com/ZS9bVfWa6/")).toBeNull();
    expect(player("https://www.instagram.com/share/reel/BBumGiQdP6/")).toBeNull();
    expect(isShortLink(new URL("https://vt.tiktok.com/ZS9bVfWa6/"))).toBe(true);
    expect(isShortLink(new URL("https://www.instagram.com/share/reel/BBumGiQdP6/"))).toBe(true);
    expect(isShortLink(new URL("https://www.tiktok.com/@savaya"))).toBe(false);
  });
});
