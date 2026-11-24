# Link reader

A small AWS Lambda that reads a pasted link for the trip app (plan D8), and checks the clubs' own sites for events. A browser cannot read another site's page, so the app asks this function instead. It holds no secret, stores nothing and never retries; the app retries a read (plan 5.4).

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

## The events check

`GET <function URL>?check=events` answers `{ ok: true, checkedAt, events, failed }`:

- `events`: at most 100, by date, each `{ destination, venue, area, date, artist, link }`, dated 1 Feb to 31 Mar 2027. `link` is the https page the event came from.
- `failed`: `[{ venue, reason }]`, one per club that failed, with the reasons above. The other clubs still run.

It reads only schema.org Event data (JSON-LD), the form clubs publish for search engines: no page layouts, no AI model, no key. A night named "Special guest" or "TBA", or a name the club gives three or more nights in the season (a house night, a sunset session), is left out. It opens only the clubs' own hosts (`event-sources.mjs`), six pages at a time, 6 seconds and 512 KB each, with the same redirect rule as a read; it opens no new page after 10 seconds. A second call within 10 minutes gets the first call's answer, so the public URL cannot make the function hammer a club.

### The clubs (each club's own site, checked from a Mac on 23 Nov 2026; Phuket and Singapore added the same day)

| Club | Source address | Events? |
|---|---|---|
| Savaya | https://www.savaya.com/event-calendar | Yes. The calendar has no event data, but it links to one page per night, and each night's page carries a schema.org Event (name and date). The check reads the nights in the season: 31 today, through 3 Mar. |
| Atlas Beach Club | https://atlasbeachfest.com/event | No. The page loads its events in the browser; its data names the business only. |
| Atlas Super Club | https://atlasbeachfest.com/super-club/event | No, as Atlas Beach Club. |
| Klymax | https://klymax.co/ | No. No event data; the page shows only this week's night. |
| Potato Head | https://seminyak.potatohead.co/whats-on | No. The list loads in the browser. Each event page has a schema.org Event, but the list links to none of them. |
| Desa Kitsuné | https://desakitsune.com/events | No. Events are plain text, to 31 Dec 2026. |
| Café del Mar Bali | https://www.cafedelmarbali.co.id/whats-on | No. Events are plain text (New Year's Eve 2026), with no event data on their pages either. |
| Single Fin | https://www.singlefinbali.com/event/ | No. The page lists no events and has no event data. |
| Full Moon Party (Haad Rin Beach) | https://fullmoonparty-thailand.com/schedules/ | No. The dates are a text table; its data is about the site and its FAQ. |
| Half Moon Festival | https://www.halfmoonfestival.com/ | No. No event data; tickets are sold on another site. |
| Jungle Experience | none found | No site of its own (jungleexperience.com did not answer). |
| Waterfall Party | none found | No site of its own (waterfallparty.com answers 404). |
| Hidden Paradise | none found | No site of its own. |
| Lost Jungle | none found | No site of its own. |
| Illuzion Phuket | https://www.illuzionphuket.com/events/list/ | Yes. The list of coming nights carries one schema.org Event per night (7 today, to 21 Dec 2026). |
| Café del Mar Phuket | https://phuket.cafedelmar.com/events | No. The list links to one page per night, but those pages have no event data. |
| Maya Beach Club | none found | No site of its own: mayabeachclubphuket.com sends to Instagram, and mayaphuket.com is a hotel. |
| XANA Beach Club | none found | No site of its own: xanabeachclub.com sends to another business, which answers 521. |
| Yona Beach Club | https://www.yonabeach.com/ | No. It blocks the request (403). |
| Armania Phuket | none found | No site found. |
| Baba Beach Club | https://www.babanatai.com/ | No. It answers with a login page. |
| Marquee | https://taogroup.com/venues/marquee-singapore/events/ (marqueesingapore.com sends here) | No. Events load in the browser; the data names the club only. |
| Zouk | https://zoukgroup.com/singapore/events/ (zoukclub.com sends here) | Yes, but only the next ten or so nights (10 today, to 2 Dec 2026), so a February or March act appears about a week before it plays. |
| CÉ LA VI | https://sg.celavi.com/ | No. Its event pages carry a schema.org Event with no date, and sg.celavi.com/events answers 404. |

Only Yona blocked the request. A club that starts to publish Event data joins by one entry in `event-sources.mjs`.

## What it allows

- Sites for a pasted link (`sites.mjs`, the only place that names them): `airbnb.com` with `www.`, `m.` and the country domains, `abnb.me`, `booking.com`, `instagram.com` and `tiktok.com` with `www.` and `m.`, and `vm.tiktok.com`.
- Sites for the events check (`event-sources.mjs`): each club's own host, today `www.savaya.com`, `www.illuzionphuket.com` and `zoukgroup.com`.
- Callers: CORS allows `https://travel-ca8f9.web.app` and `http://localhost` on any port. A call with another `Origin` gets `not_allowed`. A call with no `Origin` (curl) is served.
- Cost: reserved concurrency of 2, and a 20-second timeout for the events check.

## What the sites answered (24 Nov 2026, from the deployed function)

| Site | Result |
|---|---|
| Airbnb | Three of three listings answered with name, area, sleeps and photo. |
| Booking.com | Three of three links got a challenge page: `unreadable`. The Stay sheet falls back to typed inputs (plan case 16). |
| TikTok | A video page answered with its caption and cover, read from the page's JSON. |
| Instagram | A profile page got the login wall: `too_large` (512 KB and no title). |

## Files

- `handler.mjs`: the Lambda: the origin check, the route (a read or the events check), and the answer.
- `fetch-page.mjs`: the one fetch, with its https, redirect, size and time limits.
- `parse.mjs`: pure; reads the listing or the post from the page.
- `sites.mjs`: pure; the allowed sites for a pasted link.
- `events.mjs`: the events check, and `readEvents`, which is pure.
- `event-sources.mjs`: pure; the clubs and their hosts.
- `parse.test.mjs`, `events.test.mjs` and `fixtures/`: the header examples, against trimmed copies of saved pages, the redirect rule, and the events check with fetch replaced. No network. Run `node --test services/link-reader/*.test.mjs`.

## Deploy

`sh scripts/ship.sh --with-reader` runs `sh services/link-reader/deploy.sh` after the site deploy, so the events check goes live only with `--with-reader`; the script also runs alone. It uses the AWS profile `zen` in `us-east-2`, creates or replaces the function `travel-link-reader`, its log-only role and its public function URL, and prints the URL. A second run is safe. When the AWS sign-in has expired it stops before any change and prints `aws sso login --profile zen --use-device-code`.
