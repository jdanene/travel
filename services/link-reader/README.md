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

- `events`: at most 100, by date, each `{ destination, venue, area, date, artist, link }`, dated 25 Jan to 31 Mar 2027. `link` is the https page the event came from.
- `failed`: `[{ venue, reason }]`, one per club that failed, with the reasons above. The other clubs still run.

It reads a club's schema.org Event data (JSON-LD) where the club publishes it. Where a club lists its nights only as page text, or in a JSON feed its page loads, a reader for that one layout (`event-lists.mjs`) reads them; it breaks when the club redesigns, and the check then reports the club as `unreadable`. No AI model, no key, no browser. A night named "Special guest" or "TBA", or a name the club gives three or more nights in the season (a house night, a sunset session), is left out. Acts keep the club's own spelling, capitals included. It opens only the clubs' own hosts (`event-sources.mjs`), six pages at a time, 6 seconds and 512 KB each, with the same redirect rule as a read; it opens no new page after 10 seconds. A second call within 10 minutes gets the first call's answer, so the public URL cannot make the function hammer a club.

### The clubs (each club's own site, fetched from a Mac on 23 Nov 2026: what the page held that day)

| Club | Source address | Events? |
|---|---|---|
| Savaya | https://www.savaya.com/event-calendar | Yes. The calendar has no event data, but it links to one page per night, and each night's page carries a schema.org Event (name and date). The check reads the nights in the season: 31 today, through 3 Mar. |
| Atlas Beach Club | https://atlasbeachfest.com/event | No. The plain page holds no nights; in a browser it shows 4 (17 to 31 Dec 2026), which the page fetches with a Livewire POST that needs the page's session cookie and form token. There is no feed to GET. |
| Atlas Super Club | https://atlasbeachfest.com/super-club/event | No, as Atlas Beach Club (in a browser, 6 nights from 24 to 29 Nov 2026 on the same page). |
| Klymax | https://klymax.co/ | Yes, as text: "THIS WEEK" holds 1 night (27 Nov 2026). It never shows more than the coming week. |
| Potato Head | https://seminyak.potatohead.co/api/cached/experiences?type=Event&categories=music (the feed its "What's on" page loads) | Yes, from the feed: 2 music nights (11 and 31 Dec 2026). The feed covers today to six months ahead. Without `categories=music` it is 3.8 MB of dinners, past the 512 KB limit. |
| Desa Kitsuné | https://desakitsune.com/events | Yes, as text: 3 nights (26 Nov to 31 Dec 2026), written with no year; the year is the one in which the day falls on the given weekday. |
| Café del Mar Bali | https://www.cafedelmarbali.co.id/whats-on | Yes, as text: 1 coming night (31 Dec 2026) and 17 past ones back to 1 May 2023. |
| Single Fin | https://www.singlefinbali.com/event/ | No. The page is prose about the August 2024 surf contest; no list of nights. |
| Full Moon Party (Haad Rin Beach) | https://fullmoonparty-thailand.com/schedules/ | Yes, as text: a table of 16 rows (24 Nov 2026 to 31 Dec 2027), among them 22 Feb and 22 Mar 2027, already seeded. |
| Half Moon Festival | https://www.halfmoonfestival.com/ | No. No dates in the page text and no event data; tickets are sold on another site. |
| Jungle Experience | none found | No site of its own (jungleexperience.com did not answer). |
| Waterfall Party | none found | No site of its own (waterfallparty.com answers 404). |
| Hidden Paradise | none found | No site of its own. |
| Lost Jungle | none found | No site of its own. |
| Illuzion Phuket | https://www.illuzionphuket.com/events/list/ | Yes. The list of coming nights carries one schema.org Event per night (7 today, to 21 Dec 2026). |
| Café del Mar Phuket | https://phuket.cafedelmar.com/events | Yes, as text: 29 nights (25 Nov 2026 to 31 May 2027), each linked to its own page. None falls in February or March yet. |
| Maya Beach Club | none found | No site of its own: mayabeachclubphuket.com sends to Instagram, and mayaphuket.com is a hotel. |
| XANA Beach Club | none found | No site of its own: xanabeachclub.com sends to another business, which answers 521. |
| Yona Beach Club | https://www.yonabeach.com/ | No. It blocks the request (403). |
| Armania Phuket | none found | No site found. |
| Baba Beach Club | https://www.babanatai.com/ | No. It answers with a login page. |
| Marquee | https://taogroup.com/wp-json/wp/v2/events (the WordPress feed its events page loads, venue 824, from 1 Feb 2027) | Yes, from the feed: from today it holds 11 nights (27 Nov to 31 Dec 2026); from 1 Feb 2027, none yet. |
| Zouk | https://zoukgroup.com/singapore/events/ (zoukclub.com sends here) | Yes, but only the next ten or so nights (10 today, to 2 Dec 2026), so a February or March act appears about a week before it plays. |
| CÉ LA VI | https://sg.celavi.com/ | Yes, as text: the home page's highlights hold 6 events (25 Nov to 31 Dec 2026), 3 of them in the Club Lounge, which are the ones read; the rest are dinners and a bar takeover. |

Only Yona blocked the request. A club that starts to publish Event data joins by one entry in `event-sources.mjs`; a club with a new layout needs a reader in `event-lists.mjs`.

## What it allows

- Sites for a pasted link (`sites.mjs`, the only place that names them): `airbnb.com` with `www.`, `m.` and the country domains, `abnb.me`, `booking.com`, `instagram.com` and `tiktok.com` with `www.` and `m.`, and `vm.tiktok.com`.
- Sites for the events check (`event-sources.mjs`): each club's own host: `www.savaya.com`, `www.illuzionphuket.com`, `zoukgroup.com`, `phuket.cafedelmar.com`, `sg.celavi.com`, `klymax.co`, `www.cafedelmarbali.co.id`, `desakitsune.com`, `fullmoonparty-thailand.com`, `seminyak.potatohead.co` and `taogroup.com`.
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
- `event-lists.mjs`: pure; one reader per club that lists its nights as text or in a feed.
- `event-sources.mjs`: pure; the clubs and their hosts.
- `parse.test.mjs`, `events.test.mjs`, `event-lists.test.mjs` and `fixtures/`: the header examples, against trimmed copies of saved pages, the redirect rule, and the events check with fetch replaced. No network. Run `node --test services/link-reader/*.test.mjs`.

## Deploy

`sh scripts/ship.sh --with-reader` runs `sh services/link-reader/deploy.sh` after the site deploy, so the events check goes live only with `--with-reader`; the script also runs alone. It uses the AWS profile `zen` in `us-east-2`, creates or replaces the function `travel-link-reader`, its log-only role and its public function URL, and prints the URL. A second run is safe. When the AWS sign-in has expired it stops before any change and prints `aws sso login --profile zen --use-device-code`.
