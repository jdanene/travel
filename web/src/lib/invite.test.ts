import { describe, expect, it } from "vitest";
import { DEFAULT_INVITE_TITLE, escapeHtml, inviteLine, inviteLink } from "./invite";

// The header examples of inviteLine and escapeHtml.
describe("inviteLine", () => {
  it("puts the title in curly quotes inside the invitation", () => {
    expect(inviteLine(DEFAULT_INVITE_TITLE)).toBe("You’re invited to “Indonesia/Thailand Trip 2027”. Tap here to access");
  });
});

describe("escapeHtml", () => {
  it("escapes an ampersand", () => {
    expect(escapeHtml("Bali & Koh Phangan")).toBe("Bali &amp; Koh Phangan");
  });

  it("keeps a title from closing the meta tag it sits in", () => {
    expect(escapeHtml('"><script>')).toBe("&quot;&gt;&lt;script&gt;");
  });
});

describe("inviteLink", () => {
  it("makes the crew link, and the organizer link with a key", () => {
    expect(inviteLink("abc")).toBe("https://travel-ca8f9.web.app/?t=abc");
    expect(inviteLink("abc", "K1")).toBe("https://travel-ca8f9.web.app/?t=abc&organizer=K1");
  });
});
