import { describe, expect, it } from "vitest";
import { linkId } from "./links";

// The header examples of linkId: the typical case and the surprising one.
describe("linkId", () => {
  it("makes an id from the address", () => {
    expect(linkId("https://www.tiktok.com/@club/video/7301")).toBe("tiktok-com-club-video-7301");
  });

  it("gives the same id to the same link with a share query string", () => {
    expect(linkId("https://www.instagram.com/reel/Cx1/?igsh=abc123")).toBe(linkId("https://instagram.com/reel/Cx1/"));
  });
});
