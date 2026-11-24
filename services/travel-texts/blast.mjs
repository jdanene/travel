// "Text the crew": who gets a text, the cap, and the send itself. The
// handler (handler.mjs) gives it the caller's token and the real fetch and
// SMS client; the tests give it fakes. The app's sheet keeps copies of
// smsText and recipients (web/src/features/crew/lib/texts.ts) to draw the
// preview and the count; these are the ones that decide.

export const DATABASE_URL = "https://travel-ca8f9-default-rtdb.firebaseio.com";
export const SITE = "travel-ca8f9.web.app";
export const MAX_MESSAGE = 300;
export const MAX_RECIPIENTS = 30;
export const MAX_TEXTS_PER_DAY = 5;
/** The sender stops starting new texts after this long, so the Lambda (120 s) always answers. */
export const SEND_BUDGET_MS = 90_000;

const TRIP_ID = /^[A-Za-z0-9_-]{1,64}$/;
const MEMBER_ID = /^[a-z0-9-]{1,40}$/;
const E164 = /^\+[1-9]\d{7,14}$/;
const AUDIENCES = ["all", "in", "maybe"];

/**
 * Reads the app's request. It carries the trip, the message, who gets it,
 * and, for "Send again to failed", the member ids to try; never a number.
 *
 * Inputs: body — the parsed JSON body.
 * Output: { ok: true, tripId, message (trimmed), audience, memberIds (or null) } or { ok: false }.
 * Examples (blast.test.mjs):
 *   { tripId: "t1", message: " Hi ", audience: "in" } → { ok: true, tripId: "t1", message: "Hi", audience: "in", memberIds: null }
 *   { tripId: "t1", message: "x".repeat(301), audience: "all" } → { ok: false }
 */
export function readRequest(body) {
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const memberIds = body?.memberIds;
  const idsOk = memberIds === undefined || memberIds === null ||
    (Array.isArray(memberIds) && memberIds.length <= MAX_RECIPIENTS && memberIds.every((id) => typeof id === "string" && MEMBER_ID.test(id)));
  if (!TRIP_ID.test(body?.tripId ?? "") || !message || message.length > MAX_MESSAGE || !AUDIENCES.includes(body?.audience) || !idsOk) {
    return { ok: false };
  }
  return { ok: true, tripId: body.tripId, message, audience: body.audience, memberIds: memberIds ?? null };
}

/**
 * The text a friend receives: the trip's name, the message, the short trip link.
 * Inputs: tripName, message (trimmed), tripId. Output: the text.
 * Example: smsText("Bali · Koh Phangan", "Flights are booked!", "t1") → "Bali · Koh Phangan trip: Flights are booked! travel-ca8f9.web.app/trip/t1"
 */
export function smsText(tripName, message, tripId) {
  return `${tripName} trip: ${message} ${SITE}/trip/${tripId}`;
}

/**
 * Picks who gets a text from the numbers the sender read: everyone with a
 * number, or those who replied "I'm in" or "Maybe"; for a re-send, only
 * the ids asked for.
 *
 * Inputs: audience; phones — member id to { e164 }; members — member id to
 *   { reply }; memberIds — the ids asked for, or null for all.
 * Output: the member ids, sorted.
 * Examples (blast.test.mjs):
 *   recipients("maybe", { rb, lc }, { rb: in, lc: maybe }, null) → ["lc"]
 *   recipients("all", { rb, lc }, {}, ["lc", "zz"])              → ["lc"]   (an id with no number is left out)
 */
export function recipients(audience, phones, members, memberIds) {
  return Object.keys(phones ?? {})
    .filter((id) => audience === "all" || members?.[id]?.reply === audience)
    .filter((id) => !memberIds || memberIds.includes(id))
    .sort();
}

/**
 * The cap check: the day's next count, or no when the trip has sent its
 * five texts today.
 *
 * Inputs: log — the day's stored { texts } or null.
 * Output: { ok: true, texts } with the count after this send, or { ok: false }.
 * Examples (blast.test.mjs):
 *   nextCount(null)          → { ok: true, texts: 1 }
 *   nextCount({ texts: 4 })  → { ok: true, texts: 5 }
 *   nextCount({ texts: 5 })  → { ok: false }
 */
export function nextCount(log) {
  const texts = typeof log?.texts === "number" ? log.texts : 0;
  return texts >= MAX_TEXTS_PER_DAY ? { ok: false } : { ok: true, texts: texts + 1 };
}

/**
 * Runs one "Text the crew" from start to end: checks the token, checks the
 * caller is an organizer of the trip, reads the trip's name, replies and
 * numbers with the caller's own token (the database rules decide what it
 * may read), counts the send against today's cap, then sends one text per
 * person, one after another. A send is paid, so nothing retries: each
 * person's result goes back to the organizer, who may press "Send again to
 * failed". It logs counts and reason codes only: no message, no number,
 * no name, no trip id.
 *
 * Inputs: request — { token, body }; deps — verify (verifyIdToken), fetchFn
 *   (fetch), send (e164, text → { status: "sent" } | { status: "refused",
 *   reason } | { status: "unconfirmed" }), now (a clock in ms), log.
 * Output: { status, body }. Every refusal before the first text has
 *   sent: false: 400 bad_request / no_recipients / too_many, 401 bad_token,
 *   403 not_organizer, 429 daily_cap, 502 db_failed. Otherwise 200
 *   { ok: true, results: [{ memberId, status, reason? }], textsToday }.
 * Examples (blast.test.mjs, with a fake database and a fake send):
 *   an organizer, 2 numbers, the second refused   → 200; results sent, refused DESTINATION_PHONE_NUMBER_OPTED_OUT; textsToday 1
 *   a friend's token                             → 403 not_organizer; nothing sent
 *   the sixth send of the day                    → 429 daily_cap; nothing sent
 */
export async function textCrew({ token, body }, deps) {
  const { verify, fetchFn, send, now = Date.now, log = () => {} } = deps;
  const refuse = (status, reason) => ({ status, body: { ok: false, sent: false, reason } });

  const request = readRequest(body);
  if (!request.ok) return refuse(400, "bad_request");
  const who = await verify(token, { fetchFn, now: now() });
  if (!who.ok) {
    log({ refused: "bad_token", why: who.reason });
    return refuse(401, "bad_token");
  }

  const db = database(fetchFn, token);
  const t = request.tripId;
  const organizer = await db.get(`trips/${t}/crew/organizers/${who.uid}`);
  if (!organizer.ok) return refuse(502, "db_failed");
  if (organizer.value !== true) return refuse(403, "not_organizer");

  const [phones, members, name] = await Promise.all([
    db.get(`tripSecrets/${t}/phones`),
    db.get(`trips/${t}/crew/members`),
    db.get(`trips/${t}/info/name`),
  ]);
  if (!phones.ok || !members.ok || !name.ok) return refuse(502, "db_failed");

  const ids = recipients(request.audience, phones.value, members.value, request.memberIds);
  if (ids.length === 0) return refuse(400, "no_recipients");
  if (ids.length > MAX_RECIPIENTS) return refuse(400, "too_many");

  const counted = await countUp(db, `tripSecrets/${t}/textLog/${new Date(now()).toISOString().slice(0, 10)}`, now);
  if (!counted.ok) {
    log({ refused: counted.reason });
    return refuse(counted.reason === "daily_cap" ? 429 : 502, counted.reason);
  }

  const text = smsText(typeof name.value === "string" ? name.value : "Our", request.message, t);
  const started = now();
  const results = [];
  for (const id of ids) {
    const e164 = phones.value[id]?.e164;
    if (typeof e164 !== "string" || !E164.test(e164)) results.push({ memberId: id, status: "refused", reason: "NO_NUMBER" });
    else if (now() - started > SEND_BUDGET_MS) results.push({ memberId: id, status: "refused", reason: "TIME_UP" });
    else results.push({ memberId: id, ...(await send(e164, text)) });
  }
  log({
    texts: results.length,
    sent: results.filter((r) => r.status === "sent").length,
    refused: results.filter((r) => r.status === "refused").map((r) => r.reason),
    unconfirmed: results.filter((r) => r.status === "unconfirmed").length,
  });
  return { status: 200, body: { ok: true, results, textsToday: counted.texts } };
}

/**
 * Adds one to the day's count with a compare-and-set, so two organizers
 * pressing Send at once cannot both take the last slot. A lost race reads
 * again, three tries at most (nothing is paid yet).
 * Inputs: db, the day's path, the clock.
 * Output: { ok: true, texts } or { ok: false, reason: "daily_cap" | "db_failed" }.
 * Examples (blast.test.mjs): see textCrew.
 */
async function countUp(db, path, now) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await db.getWithTag(path);
    if (!current.ok) return { ok: false, reason: "db_failed" };
    const next = nextCount(current.value);
    if (!next.ok) return { ok: false, reason: "daily_cap" };
    const put = await db.putIfTag(path, { texts: next.texts, at: now() }, current.etag);
    if (put === "ok") return { ok: true, texts: next.texts };
    if (put !== "conflict") return { ok: false, reason: "db_failed" };
  }
  return { ok: false, reason: "db_failed" };
}

/**
 * The Realtime Database's REST API with the caller's ID token (auth=), so
 * the database rules apply to the sender exactly as to the caller's page.
 * Each call has 5 seconds and no retry.
 * Inputs: fetchFn, token. Output: get, getWithTag and putIfTag.
 * Examples: see textCrew.
 */
function database(fetchFn, token) {
  const url = (path) => `${DATABASE_URL}/${path}.json?auth=${encodeURIComponent(token)}`;
  const call = async (path, init = {}) => {
    try {
      return await fetchFn(url(path), { ...init, signal: AbortSignal.timeout(5000) });
    } catch {
      return null;
    }
  };
  return {
    async get(path) {
      const response = await call(path);
      if (!response?.ok) return { ok: false };
      return { ok: true, value: await response.json().catch(() => null) };
    },
    async getWithTag(path) {
      const response = await call(path, { headers: { "X-Firebase-ETag": "true" } });
      if (!response?.ok) return { ok: false };
      return { ok: true, value: await response.json().catch(() => null), etag: response.headers.get("etag") };
    },
    async putIfTag(path, value, etag) {
      const response = await call(path, { method: "PUT", headers: { "if-match": etag ?? "" }, body: JSON.stringify(value) });
      if (response?.ok) return "ok";
      return response?.status === 412 ? "conflict" : "failed";
    },
  };
}
