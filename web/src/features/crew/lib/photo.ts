/**
 * The profile photo's pure rules: where to crop and whether the result may
 * be saved. The browser work (decoding, drawing, encoding) is in
 * ../api/photo.ts; these two functions are what it decides with.
 */

/** The side of the saved photo, in pixels. */
export const PHOTO_SIDE = 160;

/** The longest photo the rules accept: database.rules.json, crew/members/$memberId/photo. */
export const PHOTO_MAX_CHARS = 30000;

/** The size the page aims for, about 15 KB of JPEG; past it the page tries a lower quality once. */
export const PHOTO_TARGET_CHARS = 20000;

const PREFIX = "data:image/jpeg;base64,";

/**
 * The centred square of a picture, to draw into the 160 px photo.
 *
 * Inputs: width and height of the decoded picture, in pixels (both above 0).
 * Output: { x, y, side }: the square's top-left corner and its side. The
 * square is as large as the shorter side, centred on the longer one; odd
 * leftovers round down, so the square never leaves the picture.
 * Examples (each one is a test in photo.test.ts):
 *   squareCrop(4032, 3024) → { x: 504, y: 0, side: 3024 }   a landscape phone photo
 *   squareCrop(3, 8)       → { x: 0, y: 2, side: 3 }        a tall one with an odd leftover
 */
export function squareCrop(width: number, height: number): { x: number; y: number; side: number } {
  const side = Math.min(width, height);
  return { x: Math.floor((width - side) / 2), y: Math.floor((height - side) / 2), side };
}

/**
 * Whether an encoded photo may be saved, by the same test the rules make.
 *
 * Inputs: url — the encoded photo.
 * Output: "ok" within the target size; "big" over the target but within
 * the rules' limit (worth one try at a lower quality); "too-big" over the
 * limit; "not-jpeg" when it is not a JPEG data URL (a browser that cannot
 * encode JPEG hands back PNG).
 * Examples (each one is a test in photo.test.ts):
 *   photoSize("data:image/jpeg;base64,/9j/4AAQ")        → "ok"
 *   photoSize("data:image/png;base64,iVBOR")            → "not-jpeg"
 *   a JPEG data URL of 30001 characters                → "too-big"
 */
export function photoSize(url: string): "ok" | "big" | "too-big" | "not-jpeg" {
  if (!url.startsWith(PREFIX)) return "not-jpeg";
  if (url.length > PHOTO_MAX_CHARS) return "too-big";
  return url.length > PHOTO_TARGET_CHARS ? "big" : "ok";
}
