// The header examples of verifyIdToken, with a key made here in place of Google's.
// Run: node --test services/travel-texts/*.test.mjs

import { generateKeyPairSync, sign } from "node:crypto";
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { forgetKeys, verifyIdToken } from "./token.mjs";

const NOW = 1_800_000_000_000;
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1", alg: "RS256" };
const fetchFn = async () => new Response(JSON.stringify({ keys: [jwk] }), { headers: { "cache-control": "max-age=600" } });

function token(claims, key = privateKey) {
  const part = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const head = `${part({ alg: "RS256", kid: "k1" })}.${part(claims)}`;
  return `${head}.${sign("RSA-SHA256", Buffer.from(head), key).toString("base64url")}`;
}
const claims = (extra = {}) => ({
  aud: "travel-ca8f9", iss: "https://securetoken.google.com/travel-ca8f9", sub: "uid-o", iat: NOW / 1000 - 60, exp: NOW / 1000 + 3000, ...extra,
});

beforeEach(forgetKeys);

test("accepts a token signed for travel-ca8f9", async () => {
  assert.deepEqual(await verifyIdToken(token(claims()), { fetchFn, now: NOW }), { ok: true, uid: "uid-o" });
});

test("refuses another project, an expired token and another key's signature", async () => {
  assert.deepEqual(await verifyIdToken(token(claims()), { projectId: "other", fetchFn, now: NOW }), { ok: false, reason: "wrong_project" });
  assert.deepEqual(await verifyIdToken(token(claims({ exp: NOW / 1000 - 60 })), { fetchFn, now: NOW }), { ok: false, reason: "expired" });
  const other = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  assert.deepEqual(await verifyIdToken(token(claims(), other), { fetchFn, now: NOW }), { ok: false, reason: "bad_signature" });
});
