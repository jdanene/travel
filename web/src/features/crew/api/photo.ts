import { write, type WriteResult } from "../../../lib/db";
import * as paths from "../../../lib/paths";
import { PHOTO_SIDE, photoSize, squareCrop } from "../lib/photo";

export type PhotoResult = { ok: true; url: string } | { ok: false; message: string };

/** The refusals the page shows under "Add a photo (optional)"; recorded in design/app/README.md, exception 7. */
export const PHOTO_ERRORS = {
  notImage: "That file is not a photo. Pick another.",
  unreadable: "That photo could not be read. Try another.",
  tooBig: "That photo is too large to save. Try another.",
};

/**
 * Turns a picked file into the photo the database keeps: the centred
 * square, 160 px, JPEG at 0.8, as a data URL. Over the target size it tries
 * 0.6 once; over the rules' limit it refuses with the reason.
 *
 * It decodes with createImageBitmap, which honours the photo's rotation,
 * and falls back to an img element for browsers without it. A HEIC file
 * that the browser cannot decode, a broken file, or a file too large to
 * decode lands in "could not be read". Nothing is sent anywhere.
 *
 * Inputs: file — from an input with accept="image/*".
 * Output: { ok: true, url } or { ok: false, message } in the page's words.
 * Examples (checked in Chrome at 375 px):
 *   a 4032 x 3024 JPEG   → { ok: true, url: "data:image/jpeg;base64,…" } of about 8000 characters
 *   a .txt file          → { ok: false, message: "That file is not a photo. Pick another." }
 *   a broken .jpg        → { ok: false, message: "That photo could not be read. Try another." }
 */
export async function makePhoto(file: File): Promise<PhotoResult> {
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
  canvas.width = PHOTO_SIDE;
  canvas.height = PHOTO_SIDE;
  const context = canvas.getContext("2d");
  if (!context) return { ok: false, message: PHOTO_ERRORS.unreadable };
  const { x, y, side } = squareCrop(width, height);
  context.imageSmoothingQuality = "high";
  context.drawImage(picture, x, y, side, side, 0, 0, PHOTO_SIDE, PHOTO_SIDE);
  if ("close" in picture) picture.close();

  let url = canvas.toDataURL("image/jpeg", 0.8);
  if (photoSize(url) === "big" || photoSize(url) === "too-big") url = canvas.toDataURL("image/jpeg", 0.6);
  const size = photoSize(url);
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

/**
 * Saves or removes a member's photo. Only the member's own device may: the
 * member rule covers the node, and the rules check the photo's form.
 *
 * Inputs: the trip, the member, and the photo, or null to remove it.
 * Output: the write result. With no connection it waits and lands later.
 * Examples (checked on the emulator):
 *   RB's device saves a photo  → members/rb/photo = "data:image/jpeg;base64,…"; RB's circle shows it everywhere
 *   RB's device removes it     → members/rb/photo is gone; the circle shows "RB" again
 */
export function savePhoto(tripId: string, memberId: string, url: string | null): Promise<WriteResult> {
  return write({ [paths.memberField(tripId, memberId, "photo")]: url });
}
