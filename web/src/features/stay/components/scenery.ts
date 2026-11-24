/** The project's scenery photos, the pattern of the mocks' stand-ins (case 18). */
const MEDIA = "https://travel-ca8f9-media.s3.us-east-2.amazonaws.com/public/site/";
const BY_AREA: Record<string, string> = {
  uluwatu: "bali-cliff.jpg",
  canggu: "b-beach-club.jpg",
  seminyak: "b-beach-club.jpg",
  ubud: "ubud.jpg",
  munduk: "ubud.jpg",
};
const BY_DESTINATION: Record<string, string> = { bali: "bali-cliff.jpg", kohPhangan: "kp-aerial.jpg" };

/**
 * A scenery photo for a stay whose own photo is missing or broken.
 * Inputs: the area id (from idFromName) and the destination id.
 * Output: an https photo address; the destination's photo when the area has none.
 * Examples: scenery("ubud", "bali") → ".../ubud.jpg"; scenery("haad-rin", "kohPhangan") → ".../kp-aerial.jpg"
 */
export function scenery(areaId: string, destination: string): string {
  return MEDIA + (BY_AREA[areaId] ?? BY_DESTINATION[destination] ?? "kp-beach.jpg");
}
