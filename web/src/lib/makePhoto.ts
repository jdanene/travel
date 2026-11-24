import { landscapeCrop, PHOTO_SIDE, PLACE_PHOTO_MAX_CHARS, photoSize, squareCrop } from "./photo";

export type PhotoResult = { ok: true; url: string } | { ok: false; message: string };

/** The refusals the page shows under "Add a photo"; recorded in design/app/README.md, exception 7. */
export const PHOTO_ERRORS = {
  notImage: "That file is not a photo. Pick another.",
  unreadable: "That photo could not be read. Try another.",
  tooBig: "That photo is too large to save. Try another.",
};

/** The two photos the app keeps: a member's 160 px square, and a place's 640 px landscape. */
export type PhotoShape = "face" | "place";

/**
 * Turns a picked file into the photo the database keeps, as a JPEG data
 * URL: for a face the centred square, 160 px, at 0.8 (0.6 once over the
 * target size); for a place a 4:3-at-most landscape, 640 px on the long
 * side, at 0.75 (0.55 once over 80 000 characters). Over the rules' limit
 * it refuses with the reason.
 *
 * It decodes with createImageBitmap, which honours the photo's rotation,
 * and falls back to an img element for browsers without it. A HEIC file
 * that the browser cannot decode, a broken file, or a file too large to
 * decode lands in "could not be read". Nothing is sent anywhere.
 *
 * Inputs: file — from an input with accept="image/*"; shape — "face" (the default) or "place".
 * Output: { ok: true, url } or { ok: false, message } in the page's words.
 * Examples (checked in Chrome at 375 px):
 *   a 4032 x 3024 JPEG   → { ok: true, url: "data:image/jpeg;base64,…" } of about 8000 characters
 *   a .txt file          → { ok: false, message: "That file is not a photo. Pick another." }
 *   a broken .jpg        → { ok: false, message: "That photo could not be read. Try another." }
 */
export async function makePhoto(file: File, shape: PhotoShape = "face"): Promise<PhotoResult> {
  if (!file.type.startsWith("image/")) return { ok: false, message: PHOTO_ERRORS.notImage };
  let picture: ImageBitmap | HTMLImageElement;
  try {
    picture = await decode(file);
  } catch {
    return { ok: false, message: PHOTO_ERRORS.unreadable };
  }
  const width = "naturalWidth" in picture ? picture.naturalWidth : picture.width;
  const height = "naturalHeight" in picture ? picture.naturalHeight : picture.height;
  if (!width || !height) return { ok: false, message: PHOTO_ERRORS.unreadable };

  const canvas = document.createElement("canvas");
  const crop = shape === "face" ? squareCrop(width, height) : null;
  const wide = shape === "place" ? landscapeCrop(width, height) : null;
  canvas.width = wide ? wide.width : PHOTO_SIDE;
  canvas.height = wide ? wide.height : PHOTO_SIDE;
  const context = canvas.getContext("2d");
  if (!context) return { ok: false, message: PHOTO_ERRORS.unreadable };
  context.imageSmoothingQuality = "high";
  if (wide) context.drawImage(picture, wide.x, wide.y, wide.w, wide.h, 0, 0, wide.width, wide.height);
  else if (crop) context.drawImage(picture, crop.x, crop.y, crop.side, crop.side, 0, 0, PHOTO_SIDE, PHOTO_SIDE);
  if ("close" in picture) picture.close();

  const sized = (url: string) => (wide ? photoSize(url, PLACE_PHOTO_MAX_CHARS, PLACE_PHOTO_MAX_CHARS) : photoSize(url));
  let url = canvas.toDataURL("image/jpeg", wide ? 0.75 : 0.8);
  if (sized(url) === "big" || sized(url) === "too-big") url = canvas.toDataURL("image/jpeg", wide ? 0.55 : 0.6);
  const size = sized(url);
  if (size === "not-jpeg") return { ok: false, message: PHOTO_ERRORS.unreadable };
  if (size === "too-big") return { ok: false, message: PHOTO_ERRORS.tooBig };
  return { ok: true, url };
}

/** Decodes a file into something a canvas can draw; throws when the browser cannot read it. */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Some browsers refuse the options or the format here but read it in an img element.
    }
  }
  const address = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = address;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(address);
  }
}

