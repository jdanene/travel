/**
 * The photos' pure rules, shared by the profile photo and a place's photo:
 * where to crop and whether the result may be saved. The browser work
 * (decoding, drawing, encoding) is in makePhoto.ts; these functions are
 * what it decides with.
 */

/** The side of the saved photo, in pixels. */
export const PHOTO_SIDE = 160;

/** The longest profile photo the rules accept: database.rules.json, crew/members/$memberId/photo. */
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
export function photoSize(url: string, max = PHOTO_MAX_CHARS, target = PHOTO_TARGET_CHARS): "ok" | "big" | "too-big" | "not-jpeg" {
  if (!url.startsWith(PREFIX)) return "not-jpeg";
  if (url.length > max) return "too-big";
  return url.length > target ? "big" : "ok";
}

/** A place's photo: 640 px on its long side, landscape (database.rules.json, places/custom/$placeId/photo). */
export const PLACE_PHOTO_LONG = 640;
export const PLACE_PHOTO_MAX_CHARS = 80000;

/**
 * The landscape crop of a place's photo and the size it is drawn at: a
 * picture taller than 4:3 loses its top and bottom equally down to 4:3; a
 * wider one keeps its shape. The long side becomes 640 px, never larger
 * than the picture.
 *
 * Inputs: width and height of the decoded picture (both above 0), and the long side.
 * Output: { x, y, w, h } of the crop in the picture, and { width, height } to draw.
 * Examples (each one is a test in photo.test.ts):
 *   landscapeCrop(4032, 3024) → crop the whole picture, draw 640 x 480
 *   landscapeCrop(3000, 4000) → crop 3000 x 2250 from y 875, draw 640 x 480
 */
export function landscapeCrop(width: number, height: number, long = PLACE_PHOTO_LONG) {
  const h = Math.min(height, Math.floor((width * 3) / 4));
  const y = Math.floor((height - h) / 2);
  const scale = Math.min(1, long / width);
  return { x: 0, y, w: width, h, width: Math.round(width * scale), height: Math.round(h * scale) };
}
