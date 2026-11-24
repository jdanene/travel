import { describe, expect, it } from "vitest";
import { landscapeCrop, photoSize, squareCrop } from "./photo";

// The header examples of squareCrop and photoSize.
describe("squareCrop", () => {
  it("centres the square on a landscape phone photo", () => {
    expect(squareCrop(4032, 3024)).toEqual({ x: 504, y: 0, side: 3024 });
  });
  it("rounds an odd leftover down on a tall picture", () => {
    expect(squareCrop(3, 8)).toEqual({ x: 0, y: 2, side: 3 });
  });
});

describe("photoSize", () => {
  it("accepts a small JPEG data URL", () => {
    expect(photoSize("data:image/jpeg;base64,/9j/4AAQ")).toBe("ok");
  });
  it("refuses a PNG and a JPEG one character over the limit", () => {
    expect(photoSize("data:image/png;base64,iVBOR")).toBe("not-jpeg");
    expect(photoSize("data:image/jpeg;base64," + "A".repeat(30001 - 23))).toBe("too-big");
  });
});

describe("landscapeCrop", () => {
  it("keeps a landscape phone photo whole at 640 x 480", () => {
    expect(landscapeCrop(4032, 3024)).toEqual({ x: 0, y: 0, w: 4032, h: 3024, width: 640, height: 480 });
  });
  it("cuts a portrait photo to 4:3 around its middle", () => {
    expect(landscapeCrop(3000, 4000)).toEqual({ x: 0, y: 875, w: 3000, h: 2250, width: 640, height: 480 });
  });
});
