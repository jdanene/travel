// Checks a Firebase ID token with nothing but Google's public keys, so the
// sender holds no Firebase key or service account.

import { createPublicKey, verify } from "node:crypto";

export const PROJECT_ID = "travel-ca8f9";
const KEYS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
/** A token issued a little in the future (a fast clock at Google) is still fine. */
const SKEW_S = 60;

let cached = { keys: null, until: 0 };

/**
 * Says whether a Firebase ID token is genuine and current, and whose it is.
 * It checks the RS256 signature against Google's published keys (kept for
 * as long as Google's Cache-Control allows), then the claims Firebase
 * documents: issuer and audience name the project, it has not expired, it
 * was not issued in the future, and it names a user.
 *
 * Inputs: token — the caller's ID token; options — projectId (the
 *   project, travel-ca8f9 by default), fetchFn (fetch, replaced in tests),
 *   now (milliseconds, replaced in tests).
 * Output: { ok: true, uid } or { ok: false, reason }, reason one of
 *   "malformed", "wrong_project", "expired", "bad_signature", "keys_failed".
 *   Nothing retries: a failed key fetch is refused, and the organizer presses Send again.
 * Examples (token.test.mjs, with a key made in the test):
 *   a token the test key signed for travel-ca8f9 → { ok: true, uid: "uid-o" }
 *   the same token, project "other"              → { ok: false, reason: "wrong_project" }
 *   a token that expired a minute ago             → { ok: false, reason: "expired" }
 *   a token signed by another key                 → { ok: false, reason: "bad_signature" }
 */
export async function verifyIdToken(token, { projectId = PROJECT_ID, fetchFn = fetch, now = Date.now() } = {}) {
  const parts = typeof token === "string" ? token.split(".") : [];
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const header = decode(parts[0]);
  const claims = decode(parts[1]);
  if (!header || !claims || header.alg !== "RS256" || typeof header.kid !== "string") return { ok: false, reason: "malformed" };

  const seconds = Math.floor(now / 1000);
  if (claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}`) return { ok: false, reason: "wrong_project" };
  if (typeof claims.exp !== "number" || claims.exp <= seconds) return { ok: false, reason: "expired" };
  if (typeof claims.iat !== "number" || claims.iat > seconds + SKEW_S) return { ok: false, reason: "malformed" };
  if (typeof claims.sub !== "string" || claims.sub.length === 0 || claims.sub.length > 128) return { ok: false, reason: "malformed" };

  const keys = await publicKeys(fetchFn, now);
  if (!keys) return { ok: false, reason: "keys_failed" };
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) return { ok: false, reason: "bad_signature" };
  let good = false;
  try {
    good = verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(parts[2], "base64url"));
  } catch {
    good = false;
  }
  return good ? { ok: true, uid: claims.sub } : { ok: false, reason: "bad_signature" };
}

/** Reads one base64url JSON part of a token, or null. */
function decode(part) {
  try {
    const value = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Google's signing keys for Firebase ID tokens, kept until Cache-Control's
 * max-age runs out (an hour if it gives none). One fetch, 4 seconds, no retry.
 * Inputs: fetchFn and now, as above. Output: the JWK list, or null.
 * Examples: see verifyIdToken.
 */
async function publicKeys(fetchFn, now) {
  if (cached.keys && now < cached.until) return cached.keys;
  try {
    const response = await fetchFn(KEYS_URL, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;
    const body = await response.json();
    if (!Array.isArray(body?.keys)) return null;
    const maxAge = /max-age=(\d+)/.exec(response.headers.get("cache-control") ?? "");
    cached = { keys: body.keys, until: now + (maxAge ? Number(maxAge[1]) : 3600) * 1000 };
    return cached.keys;
  } catch {
    return null;
  }
}

/** Forgets the kept keys; tests call it so each starts clean. */
export function forgetKeys() {
  cached = { keys: null, until: 0 };
}
