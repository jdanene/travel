import type { Member, MemberId } from "../../../types/trip";

/**
 * The rules of "Text the crew" that the organizer's sheet shows before a
 * send. The sender (services/travel-texts/blast.mjs) holds the same rules
 * and decides; these copies only draw the preview and the count, so a
 * change here must be made there too. The sender's copies carry the tests;
 * the examples here were checked by hand in the sheet.
 */

/** Who a text goes to: everyone with a number, or those who replied "I'm in" or "Maybe". */
export type Audience = "all" | "in" | "maybe";

export const AUDIENCES: Array<{ audience: Audience; label: string }> = [
  { audience: "all", label: "Everyone with a number" },
  { audience: "in", label: "I'm in" },
  { audience: "maybe", label: "Maybe" },
];

/** The longest message, the most people one text may reach, and AWS's price cap per text (MapPack's MaxPrice). */
export const MAX_MESSAGE = 300;
export const MAX_RECIPIENTS = 30;
export const MAX_PRICE_USD = 0.15;

/** The site the short trip link points at. */
export const SITE = "travel-ca8f9.web.app";

/**
 * Makes the text a friend receives: the trip's name, the message, and the
 * trip's link without "https://", which phones still turn into a link.
 *
 * Inputs: tripName — info.name; message — as typed (trimmed here); tripId.
 * Output: the full text.
 * Examples (checked by hand):
 *   smsText("Bali · Koh Phangan", " Flights are booked! ", "t1") → "Bali · Koh Phangan trip: Flights are booked! travel-ca8f9.web.app/trip/t1"
 *   smsText("Bali · Koh Phangan", "", "t1")                      → "Bali · Koh Phangan trip: … travel-ca8f9.web.app/trip/t1"
 */
export function smsText(tripName: string, message: string, tripId: string): string {
  return `${tripName} trip: ${message.trim() || "…"} ${SITE}/trip/${tripId}`;
}

/**
 * Picks who gets a text: the members with a number, by reply. A number
 * whose member record is gone still counts for "Everyone".
 *
 * Inputs: audience; phones — member id to { e164 } (the organizer's read);
 * members — the crew's member records.
 * Output: the member ids, in name order.
 * Examples (checked by hand):
 *   recipients("all", { rb: …, lc: … }, { rb: in, lc: maybe })    → ["lc", "rb"]
 *   recipients("maybe", { rb: …, lc: … }, { rb: in, lc: maybe })  → ["lc"]
 *   recipients("in", { rb: … }, {})                              → []   (no reply on record, so not "I'm in")
 */
export function recipients(audience: Audience, phones: Record<MemberId, unknown>, members: Record<MemberId, Member>): MemberId[] {
  return Object.keys(phones)
    .filter((id) => audience === "all" || members[id]?.reply === audience)
    .sort((a, b) => (members[a]?.name ?? a).localeCompare(members[b]?.name ?? b));
}

/**
 * The most a send can cost: AWS refuses any text priced over MaxPrice, so
 * the count times the cap is the worst case.
 *
 * Inputs: count — the number of texts.
 * Output: dollars, as "$1.05".
 * Examples (checked by hand):
 *   worstCost(7)  → "$1.05"
 *   worstCost(30) → "$4.50"
 */
export function worstCost(count: number): string {
  return `$${(count * MAX_PRICE_USD).toFixed(2)}`;
}

/**
 * Says in plain words why AWS refused one text, from its reason code. An
 * unknown code is shown as it is, so nothing is hidden.
 *
 * Inputs: code — the sender's reason for one recipient.
 * Output: words for the results list.
 * Examples (checked by hand):
 *   refusalWords("DESTINATION_PHONE_NUMBER_OPTED_OUT") → "Replied STOP"
 *   refusalWords("SomethingNew")                       → "SomethingNew"
 */
export function refusalWords(code: string | undefined): string {
  const words: Record<string, string> = {
    DESTINATION_PHONE_NUMBER_OPTED_OUT: "Replied STOP",
    DESTINATION_PHONE_NUMBER_NOT_VERIFIED: "Not verified while AWS texting is in its sandbox",
    PRICE_OVER_THRESHOLD: "Costs more than $0.15 to send",
    DESTINATION_COUNTRY_BLOCKED: "Can't text this country",
    ThrottlingException: "AWS was busy",
    NO_CONNECTION: "AWS was not reached",
    TIME_UP: "Not tried: the send ran out of time",
    NO_NUMBER: "No number on file any more",
    MONTHLY_SPEND_LIMIT_REACHED_FOR_TEXT: "The monthly texting budget is spent",
  };
  return (code && words[code]) ?? code ?? "Refused";
}
