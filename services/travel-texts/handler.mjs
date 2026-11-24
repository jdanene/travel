// The trip texts sender: an AWS Lambda behind a function URL, in the MapPack
// AWS account. It sends "Text the crew" from the registered number that
// MapPack already uses, through AWS End User Messaging SMS. The rules live
// in blast.mjs; this file is the HTTP edge and the SMS client.

import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from "@aws-sdk/client-pinpoint-sms-voice-v2";
import { textCrew } from "./blast.mjs";
import { verifyIdToken } from "./token.mjs";

const ORIGINS = /^(https:\/\/travel-ca8f9\.web\.app|http:\/\/localhost(:\d{1,5})?)$/;
/** AWS refuses any text priced above this, in US dollars (MapPack's MaxPrice). */
const MAX_PRICE_USD = "0.15";
const ORIGINATION_ARN = process.env.SMS_ORIGINATION_ARN ?? "";

// One attempt, 2 s to connect and 6 s to answer, as MapPack's sender: a send can never outlive the call.
const sms = new PinpointSMSVoiceV2Client({
  region: ORIGINATION_ARN.split(":")[3] || "us-west-2",
  maxAttempts: 1,
  requestHandler: { connectionTimeout: 2000, requestTimeout: 6000 },
});

/**
 * Sends one text and says what happened, in MapPack's three outcomes:
 * sent (AWS gave a message id), refused (AWS said no, or the request never
 * left: nothing spent) or unconfirmed (it left and no usable answer came:
 * it may have gone). It never retries and never logs the number or text.
 *
 * Inputs: e164 — the number the sender read; text — the whole text.
 * Output: { status: "sent" } | { status: "refused", reason } | { status: "unconfirmed" }.
 *   reason is AWS's Reason when it gave one (DESTINATION_PHONE_NUMBER_OPTED_OUT,
 *   PRICE_OVER_THRESHOLD, …), else its error name, or NO_CONNECTION / NO_ORIGINATION.
 * Examples (checked on the deployed function):
 *   an unverified number while the account is in the SMS sandbox → { status: "refused", reason: "DESTINATION_PHONE_NUMBER_NOT_VERIFIED" }
 */
async function sendOne(e164, text) {
  if (!ORIGINATION_ARN) return { status: "refused", reason: "NO_ORIGINATION" };
  try {
    const answer = await sms.send(
      new SendTextMessageCommand({
        DestinationPhoneNumber: e164,
        OriginationIdentity: ORIGINATION_ARN,
        MessageBody: text,
        MessageType: "TRANSACTIONAL",
        MaxPrice: MAX_PRICE_USD,
      }),
    );
    return typeof answer.MessageId === "string" && answer.MessageId ? { status: "sent" } : { status: "unconfirmed" };
  } catch (error) {
    // An answer from AWS (it carries $metadata with a status) is a refusal: nothing was sent.
    if (error?.$metadata?.httpStatusCode) return { status: "refused", reason: String(error.Reason ?? error.name ?? "AWS_REFUSED") };
    if (["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"].includes(error?.code)) return { status: "refused", reason: "NO_CONNECTION" };
    return { status: "unconfirmed" };
  }
}

/**
 * Answers POST with "Text the crew" for an organizer of the trip.
 *
 * Inputs: event — a Lambda function URL event. Its Authorization header is
 *   "Bearer <Firebase ID token>"; its JSON body is { tripId, message,
 *   audience: "all" | "in" | "maybe", memberIds? }. Its Origin, when
 *   present, must be https://travel-ca8f9.web.app or http://localhost.
 * Output: an HTTP response with JSON, as textCrew in blast.mjs; 204 for a
 *   CORS preflight, 403 not_allowed for another site, 405 for another method.
 * Examples (checked on the deployed function; see README.md):
 *   OPTIONS from https://travel-ca8f9.web.app → 204 with CORS headers
 *   POST with no token                         → 401 { ok: false, sent: false, reason: "bad_token" }
 */
export async function handler(event) {
  const method = event?.requestContext?.http?.method ?? "GET";
  const origin = event?.headers?.origin;
  const cors = origin && ORIGINS.test(origin)
    ? { "access-control-allow-origin": origin, "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "POST, OPTIONS", "access-control-max-age": "600", vary: "Origin" }
    : {};
  const reply = (status, body) => ({ statusCode: status, headers: { "content-type": "application/json", ...cors }, body: JSON.stringify(body) });

  if (origin && !ORIGINS.test(origin)) return reply(403, { ok: false, sent: false, reason: "not_allowed" });
  if (method === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (method !== "POST") return reply(405, { ok: false, sent: false, reason: "method" });

  let body = null;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body ?? "", "base64").toString("utf8") : event.body ?? "";
    body = raw.length <= 4000 ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  const token = /^Bearer (\S+)$/.exec(event?.headers?.authorization ?? "")?.[1] ?? "";
  const result = await textCrew({ token, body }, { verify: verifyIdToken, fetchFn: fetch, send: sendOne, log: (line) => console.log(JSON.stringify(line)) });
  return reply(result.status, result.body);
}
