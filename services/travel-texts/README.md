# Trip texts sender

A small AWS Lambda that sends the organizer's "Text the crew" from the registered toll-free number MapPack already uses, through AWS End User Messaging SMS. It lives in the MapPack AWS account (profile `mappack`, `us-west-2`) as `travel-texts`, behind a public function URL. It holds no Firebase key: it checks the caller's Firebase ID token with Google's public keys, then reads the database with that same token, so the database rules decide what it may read and write.

## The call

`POST <function URL>` with `Authorization: Bearer <Firebase ID token>` and a JSON body:

```json
{ "tripId": "…", "message": "Flights are booked!", "audience": "all", "memberIds": ["…"] }
```

`audience` is `all` (everyone with a number), `in` or `maybe`. `memberIds` is optional; "Send again to failed" sends the refused ones. The request never carries a phone number: the sender reads them from `tripSecrets/{tripId}/phones`.

| Answer | When |
|---|---|
| 200 `{ ok: true, results: [{ memberId, status, reason? }], textsToday }` | It sent. `status` is `sent`, `refused` (AWS said no, nothing spent; `reason` is AWS's code) or `unconfirmed` (no usable answer: it may have gone). |
| 400 `bad_request`, `no_recipients`, `too_many` | The body is wrong, nobody in the group has a number, or more than 30 would get it. |
| 401 `bad_token` | No token, or not a current token for `travel-ca8f9`. |
| 403 `not_organizer`, `not_allowed` | The caller is not an organizer of the trip, or the call comes from another site. |
| 429 `daily_cap` | The trip has sent 5 texts today (UTC). |
| 502 `db_failed` | The database could not be read or the count could not be written. |

Every answer before the first text carries `sent: false`: nothing went out.

## What it promises

- **The caller is an organizer.** It verifies the RS256 signature, issuer, audience and expiry, then reads `/trips/{tripId}/crew/organizers/{uid}` with the token.
- **Caps, held in the database.** At most 30 people per text. At most 5 texts per trip per UTC day: before sending, it adds one to `tripSecrets/{tripId}/textLog/{yyyy-mm-dd}` with a compare-and-set (ETag); the rules let the count only go up by one, stop at 5, and never be removed. A send counts even if every text is refused.
- **Paid, so no retries.** One attempt per text (`maxAttempts: 1`, 2 s to connect, 6 s to answer), `MessageType: TRANSACTIONAL`, `MaxPrice: 0.15`. It starts no new text after 90 s; the rest come back refused as `TIME_UP`. The organizer re-sends by hand.
- **Logs no message, number, name or trip id.** Only counts and reason codes.
- **CORS** for `https://travel-ca8f9.web.app` and `http://localhost` only.

## Permissions

The role `travel-texts` has one inline policy, `logs-and-one-number`: write its own log group, and `sms-voice:SendTextMessage` on the one shared number's ARN. Nothing else. `deploy.sh` finds that ARN read-only (`describe-phone-numbers --owner SHARED`, the one active toll-free number) or takes `TEXTS_ORIGINATION_ARN`. It never creates, changes or releases a number or registration, and touches nothing of MapPack's.

## Before texts reach friends

The MapPack account's SMS is in the AWS **sandbox** with a **$1 monthly spend limit**. In the sandbox AWS refuses every number that is not a verified destination (`DESTINATION_PHONE_NUMBER_NOT_VERIFIED`), and the sheet shows that per person. A toll-free number also texts only US and Canadian numbers. The number's registration belongs to the account that owns it; whether its use case covers trip texts is for the owner to confirm there.

## Deploy and test

- Deploy: `sh services/travel-texts/deploy.sh`, or `sh scripts/ship.sh --with-texts`. Put the printed URL in `web/.env.production` as `VITE_TEXTS_URL`.
- Tests: `node --test services/travel-texts/*.test.mjs` (the token check with a key made in the test, the cap check, and a whole send against a fake database and SMS client).
