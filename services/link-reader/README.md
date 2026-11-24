# Link reader

A small AWS Lambda that reads a pasted link for the trip app (plan D8). A browser cannot read another site's page, so the app asks this function instead. It holds no secret, stores nothing and never retries; the app retries (plan 5.4).

## The call

`GET <function URL>?url=<address>` always answers status 200 with JSON when the read ran:

| Link | Answer |
|---|---|
| Airbnb or Booking.com listing | `{ ok: true, name, photoUrl?, area?, sleeps? }` |
| Instagram or TikTok post | `{ ok: true, title, photoUrl? }` |
| Anything it cannot read | `{ ok: false, reason }` |

`reason` is one of:

- `not_allowed`: the address is not `https`, its host is not an allowed site, a redirect leaves the site or goes past three, or the call comes from another site. Nothing is fetched for the first and the last.
- `unreadable`: the page has no title, is a challenge page or a login wall, answers with an error status, or the connection breaks.
- `timeout`: no answer within 6 seconds.
- `too_large`: the first 512 KB holds nothing to show. The reader never reads past 512 KB.

`photoUrl` is always an absolute `https` address. The caller needs nothing else.

## What it allows

- Sites (`sites.mjs`, the only place that names them): `airbnb.com` with `www.`, `m.` and the country domains, `abnb.me`, `booking.com`, `instagram.com` and `tiktok.com` with `www.` and `m.`, and `vm.tiktok.com`.
- Callers: CORS allows `https://travel-ca8f9.web.app` and `http://localhost` on any port. A call with another `Origin` gets `not_allowed`. A call with no `Origin` (curl) is served.
- Cost: reserved concurrency of 2.

## What the sites answered (24 Nov 2026, from the deployed function)

| Site | Result |
|---|---|
| Airbnb | Three of three listings answered with name, area, sleeps and photo. |
| Booking.com | Three of three links got a challenge page: `unreadable`. The Stay sheet falls back to typed inputs (plan case 16). |
| TikTok | A video page answered with its caption and cover, read from the page's JSON. |
| Instagram | A profile page got the login wall: `too_large` (512 KB and no title). |

## Files

- `handler.mjs`: the Lambda: the origin check, the fetch with its redirect, size and time limits, and the answer.
- `parse.mjs`: pure; reads the listing or the post from the page.
- `sites.mjs`: pure; the allowed sites.
- `parse.test.mjs` and `fixtures/`: the header examples, against trimmed copies of saved pages, and the redirect rule. No network. Run `node --test services/link-reader/parse.test.mjs`.

## Deploy

`sh scripts/ship.sh --with-reader` runs `sh services/link-reader/deploy.sh` after the site deploy; the script also runs alone. It uses the AWS profile `zen` in `us-east-2`, creates or replaces the function `travel-link-reader`, its log-only role and its public function URL, and prints the URL. A second run is safe. When the AWS sign-in has expired it stops before any change and prints `aws sso login --profile zen --use-device-code`.
