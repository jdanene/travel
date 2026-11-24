# Trip app: implementation plan

The Linear project is "Travel · Trip app (design 20)" (P-JDA-48, team JDA). This file holds the decisions, the domain model, the data contract, the audits, the edge cases and, in section 9, the tickets.

## 1. Overview

Build the first version of the trip app: one link opens one page, and that page asks for one thing at a time. A friend picks a name, answers the dates, hearts a stay and says "I'm in" for parties. The organizer confirms the dates and the stays on the same page. A map shows the stays and the venues. The hype splash gets one button that opens the app.

Sources: `docs/requirements.md` section 0, the mocks `public/designs/12/index.html` (home page and module frame) and `public/designs/20/index.html` (what is inside a module), and `design/app/README.md` (screen tables and exceptions).

## 2. Decisions

| # | Decision | Reason |
|---|---|---|
| D1 | The app is a Vite + React + TypeScript single page in `web/`. It builds into `public/app/` and Firebase Hosting serves it at `/trip/<tripId>`. | The hype pages stay plain files. One hosting site, one deploy. |
| D2 | Data is in Firebase Realtime Database. There is no server of our own for trip data. | The owner chose Realtime Database. Live updates come free. Works on the free plan. |
| D3 | Sign-in is Firebase anonymous sign-in. A friend is a `member`; a phone is a `device` that points to one member. | "Join with a name" needs no account. A second phone picks the same name and becomes the same member. |
| D4 | The trip id in the link is the key. It is 20 random characters. The rules refuse a list of trips. | Whoever has the link is in the crew. Nothing else is needed. |
| D5 | The organizer opens a second link that carries an organizer key. The key is stored where no phone can read it; the rules only test that it exists. | The organizer uses the same page and needs no password. |
| D6 | The expected crew names come from a local trip file. The join sheet shows them as buttons, plus one field for a name not on the list. | One tap instead of typing. It also makes "RJ and LC not yet" possible (screen 1). |
| D7 | One listener reads the whole trip. Each feature selects its part. | The data is small (about 10 friends). One loading state and one error state for the page. |
| D8 | A pasted link is read by one small AWS Lambda (`services/link-reader/`), in the account that holds the media bucket. | A browser cannot read another site's page. Firebase functions need the paid plan. |
| D9 | Party data is seeded from `data/lineups/*.json` by a script. The seed never deletes. | The automatic lineup checker is backlog. A re-run must keep friends' entries and "I'm in" marks. |
| D10 | A stay has no exact position. Its pin sits at the centre of its area (Uluwatu, Canggu, Haad Rin and so on). | A listing page does not give coordinates. The area is enough to compare places. |
| D11 | One branch `trip-app` from `origin/main`, one pull request. | Owner's rule: one project, one PR. |
| D12 | `scripts/ship.sh` is the one deploy command. It is new, and it is the maintained one from now on. | The repo has no deploy script yet. |
| D13 | The home page is design 12's flyer: the cover photo, the organizer's avatar, the name, the date line, and a stack of equal module buttons that open in place (Dates, Stay, Parties, Links, Map). Inside a module, design 20's content and sheets. | Owner, 23 Nov 2026. One open module at a time keeps one job on the screen. |
| D14 | Links is a module: a friend pastes an Instagram, TikTok or other link for a destination, and it shows for everyone. Its data is `links/items`; the link reader also reads Instagram and TikTok. | Owner, 23 Nov 2026: the bucket for cool things found online. |

Each was weighed against a second design. D1 against plain files with no build (rejected: nine screens of live state in hand-written DOM code is harder to read than components). D3 against email links (rejected: a step to learn). D7 against one listener per feature (rejected: five loading states for one small page). D8 against typed fields only (rejected: screen 5 shows the listing's name and photo; typed fields stay as the fallback).

## 3. Domain model

### Words (use these in code; the screen keeps the mock's words)

| Word | Meaning | On screen |
|---|---|---|
| trip | The one aggregate. Everything hangs from it. | "Bali · Koh Phangan" |
| member | One friend in the crew. Has a name and a reply. | initials |
| device | One phone or browser. Points to one member. | not shown |
| organizer | A device that claimed the organizer key. | "Organizer view." |
| reply | in, maybe or out. | "I'm in", "Maybe", "Can't make it" |
| date option | One range of days. | "Sat 13 – Tue 23 Feb" |
| answer | A member's yes, maybe or no to a date option. | "Yes", "Maybe", "No" |
| destination | Bali or Koh Phangan. | "Bali", "Koh Phangan" |
| area | A part of a destination, with a map centre. | "Uluwatu", "Haad Rin" |
| stay option | One pasted listing. | a card under "Where do we stay?"; the sheet says "Add a place" |
| heart | A member likes a stay option. | the heart and its count |
| venue | A club or party place in an area. | "Savaya" |
| show | One date at one venue with who is playing. | a row under "Who's playing" |
| last-year show | A show from the 2026 file. Read only. | "Here is who played this weekend last year:" |
| in | A member is going to a show. | "I'm in" |
| confirm | The organizer settles the dates or a destination's stay. | "Confirm these dates", "Confirm this stay" |
| module | One of Dates, Stay, Parties, Links and Map: a button on the home page that opens in place, with its state on the right. | "Dates" · "Tap to answer" |
| link | One saved Instagram, TikTok or other address for a destination. | a card in Links |

"Place" means two things in the owner's notes (a destination, and a listing). Code never uses it.

### Contexts and folders

Each context is one folder under `web/src/features/`. Each owns one branch of the trip's data.

| Context | Owns | Rules it holds |
|---|---|---|
| `crew` | members, devices, replies, the organizer claim | initials; who has not replied |
| `dates` | date options, answers, the confirmed option | counts; "Most yes"; who has not answered |
| `stay` | stay options, hearts, the confirmed stay per destination | one option per listing address; reading a link |
| `parties` | shows, last-year shows, who is in | the last-year line; "not confirmed"; a friend's own entries |
| `links` | saved links | one card per address; a friend's own links |
| `map` | nothing. It draws the pins it is given. | pins that share a spot fan out |

`web/src/app/` is the shell. It owns the route, the home page, the modules rule and its state lines, and the "All set" line, because those join several contexts. `web/src/lib/`, `web/src/components/` and `web/src/types/` are shared.

Code flows one way: shared → features → app. A feature never imports another feature. What two features need moves to a shared folder. No barrel files. Every folder has a `README.md` that says what it is for, what belongs in it, what does not, and who may import it.

Each rule above is one pure function in the context's `lib/`, with the four-part header (description, inputs, output, examples). Every example is a test.

### The modules rule (`web/src/app/lib/modules.ts`)

The home page is a stack of module buttons of equal weight (owner, 23 Nov 2026; D13). The order is fixed and means nothing: Dates, Stay, Parties, Links, Map. All start closed; one is open at a time, and opening one closes the other. A module opens in place, as on screens 12/3 to 12/5.

`modules(trip, memberId)` returns the ordered list of modules to show, each with the state line on the right of its button:

- **Dates:** "Tap to answer" before the member answers; once the dates are confirmed, the result, "13–23 Feb · confirmed".
- **Stay:** present only once the dates are confirmed. "7 options · heart one" before a stay is confirmed; then the result per destination, "Cliffside villa · confirmed" (two lines when both destinations have one).
- **Parties:** "6 shows · I'm in". Open from the start; never settled.
- **Links:** the count of links. Open from the start.
- **Map:** opens the map.

The only rule of order: the Stay button does not exist until the organizer confirms the dates. If the confirm is undone it disappears again; its options and hearts stay saved (case 42). No stay pins on the map before then.

When the dates and every destination that has a stay option have a confirmed stay, a small line under the title reads "All set". Nothing else changes. There are no stages, no leading block, no "next" rows, no pinned lines and no separate "All set" screen.

### The last-year rule (`web/src/features/parties/lib/lastYear.ts`)

For each venue, for each weekend (Friday to Sunday) from 1 February to 31 March 2027: if the venue has no show this year on those days, show the last-year shows at that venue on the days 364 days before. 364 days keeps the weekday: Sat 6 Feb 2027 maps to Sat 7 Feb 2026, as on screen 7. If last year has nothing there, show nothing for that weekend.

## 4. Data contract

Paths live in one file, `web/src/lib/paths.ts`. The rules file repeats them; the rules tests hold the two together.

```
/trips/{tripId}
  info        { name, summary?, note?, noteBy?, season: {from, to}, anchor: {name, date},
                destinations: {bali:{name, lat, lng}, kohPhangan:{name, lat, lng}} }
  crew
    expected  { {memberId}: name }                    from the trip file
    members   { {memberId}: { name, reply, at } }
    devices   { {uid}: memberId }
    organizers{ {uid}: true }
  dates
    options   { {optionId}: { from, to } }
    answers   { {optionId}: { {memberId}: "yes"|"maybe"|"no" } }
    confirmed { optionId, by, at } | absent
  stay
    options   { {stayId}: { destination, url, name, area, sleeps?, photoUrl?, addedBy, at } }
    hearts    { {stayId}: { {memberId}: true } }
    confirmed { {destination}: { stayId, by, at } }
  parties
    shows     { {showId}: { destination, venue, area?, date, artist, link?, verified, source: "seed"|"friend", addedBy?, at } }
    lastYear  { {showId}: { destination, venue, date, artist } }
    in        { {showId}: { {memberId}: true } }
  links
    items     { {linkId}: { url, site: "instagram"|"tiktok"|"other", destination, note?, title?, thumbUrl?, addedBy, at } }
  places
    areas     { {areaId}: { name, destination, lat, lng } }
    venues    { {venueId}: { name, destination, areaId?, lat, lng, line?, onMap? } }
/tripSecrets/{tripId}            no phone can read this branch
  organizerKey { {key}: true }
  claims       { {uid}: key }    a device writes its own claim; the rules test the key exists
```

Ids that must not repeat are made from their content: a member, area or venue id from its name (`web/src/lib/ids.ts`, which the scripts import too); a date option id from its two days; a `linkId` from the link address without its query string; `stayId` from the listing address without its query string; a seeded `showId` from destination, venue, date and artist. Two friends who add the same thing write the same record.

Rules, in words:

- Nobody lists `/trips`. A signed-in device reads one trip when it knows the id.
- A device writes `crew/devices/{its own uid}` and nothing else there.
- A device writes an answer, a heart, an "in" mark or a reply only under the member its uid points to.
- A device adds a link and removes its own; an organizer removes any link.
- A device adds a stay option or a show with `addedBy` equal to its member. It edits or removes a show only when it added it, or when it is an organizer.
- Only an organizer writes `dates/confirmed`, `stay/confirmed` and `crew/organizers`. A device becomes an organizer when its claim holds a key that exists.
- Every write is checked for shape and length. A value outside the shape is refused.

## 5. Audits (create-a-project, section 10)

### 5.1 What exists

Read on 23 Nov 2026 with `grep -rn -i` over `docs`, `design` and `public`.

- `docs/requirements.md` section 0 states the three goals, the five things in the first version, the look, and what "like Paperless / Partiful" means. This plan restates none of it; it adds only the decisions in section 2.
- `public/designs/20/index.html` (196 lines; all ten screens on line 183) fixes every screen. `design/app/README.md` maps screens to requirements.
- `data/lineups/2027-feb-mar.json` (15 shows) and `data/lineups/2026-feb-mar.json` (28 shows) hold the party data. Fields: `date`, `artist`, `venue`, `area`, `place`, `source`, `verified`.
- `public/assets/hype.js` and `hype.css` run the hype pages. The app shares no code with them.
- `firebase.json` has hosting only. There is no database, no rules file, no `web/`, no `scripts/`, no `AGENTS.md`.
- On `origin/main` there are only `.firebaserc`, `.gitignore`, `README.md`, `firebase.json`, `public/index.html`, `design/cover/cover.py` and `design/references/`. The mock, the requirements and the lineup files are in the working folder but not committed. Ticket Trip 0 commits them.

### 5.2 Reuse and refactor

There is no app code yet, so there is nothing to move. The rules for the build:

- One sheet component (`web/src/components/Sheet.tsx`) serves Add a place, Add a party, Add a link and the join sheet.
- One avatar row (`Avatars.tsx`) serves every "who" list: replies, said yes, hearts, in.
- One notice component (`Notice.tsx`) shows every failure and the organizer line.
- One write helper (`web/src/lib/db.ts`) wraps every database write and turns a refusal or a lost connection into a message. No feature calls the Firebase SDK directly.
- The map uses Leaflet with OpenStreetMap tiles, as the mock does (lines 7 to 8 of the mock load it).
- Trip 14 changes `public/assets/hype.js`: the button is one function there, called by options 1 and 13. It is not copied into each page.

A third copy of a fetch, a path or a date format is a finding in review.

### 5.3 Edge cases

The number is the case's id. Each ticket lists its own.

**Load and join (Trip 4, Trip 5, Trip 6)**
1. The trip id is not in the database: the page says the link does not open a trip and to ask the organizer for the link. No retry.
2. No connection on first load: the page says so after 5 seconds and tries again by itself; the SDK reconnects.
3. Anonymous sign-in fails (private mode, blocked storage): three tries, then a message with the reason and a "Try again" button.
4. The same friend on a second phone picks their name: the device points to the same member.
5. Two friends pick the same name: both devices point to one member. Allowed. The last answer wins.
6. A typed name is empty, longer than 24 characters, or equal to a name on the list: trim it; refuse empty and long with the reason; an equal name joins as that member.
7. A member changes the reply: the new one replaces the old.
8. No expected names in the trip file: the join sheet shows only the field, and the page says "N replied" without "not yet".
9. The trip record is half there (no `info`, or no `dates/options`): each block shows its empty state; nothing throws.
42. The organizer undoes the date confirm: Stay hides again; its options and hearts stay saved and return on the next confirm.

**Dates (Trip 7)**
10. A member changes an answer: the new one replaces the old.
11. Two organizer devices confirm at once: a transaction; the first wins, the second sees the confirmed state.
12. The organizer confirms an option nobody said yes to: allowed.
13. An answer points to an option that no longer exists, or holds a wrong value: ignore it.
14. After the confirm: answers stay readable; the Dates button shows the result and still opens.

**Link reader and stay (Trip 8, Trip 9)**
15. The text is not an Airbnb or Booking.com link: say "Paste an Airbnb or Booking.com link." and make no call.
16. The reader fails, times out (8 s) or reads no title: two more tries (after 1 s and 3 s), then the sheet shows inputs for the name, the area and "sleeps". The friend can still add the place.
17. The same listing pasted twice, by one friend or two at once: the id comes from the address, so there is one card; the sheet opens that card.
18. The photo address stops working later: the card shows the area's scenery photo.
19. A heart tapped with no connection: it shows at once and sends when the connection is back; if the rules refuse it, it flips back with the reason.
20. Two organizer devices confirm a stay for one destination at once: a transaction, as in case 11.
21. The reader is called from another site, or with an address outside the two sites, or the site redirects elsewhere: refuse. Follow at most 3 redirects, each inside the allowed sites. Read at most 512 KB.
22. The site answers with a challenge page: the reader returns `ok: false, reason: "unreadable"`; case 16 follows.

**Parties (Trip 10, Trip 11)**
23. The seed runs twice: same ids, so no duplicates; friends' entries and "in" marks stay.
24. A show leaves the lineup file: the seed does not delete it. The organizer removes it on the page.
25. A show has `verified: false`: it carries "not confirmed".
26. A venue has shows this year on a weekend: no last-year line for that weekend. Last year has nothing: no line.
27. A friend adds a party with a field missing, a date outside 1 Feb to 31 Mar 2027, or a link that is not an address: refuse with the reason next to the field.
28. A friend adds a party that matches a show (same venue, date and artist, ignoring case and spaces): open that row; add nothing.
29. A friend removes their party: its "in" marks go with it.
30. The artist text is long (the seed has lines of 100 characters): two lines, then cut.
31. Nobody is in yet: the row says "Be the first in" (screen 7).

**Map and module states (Trip 12, Trip 13)**
32. The map tiles do not load: a notice, and the pins as a plain list that opens the same cards.
33. A stay has an area that is not in `places/areas`: its pin sits at the destination's centre.
34. A friend's party names a venue that is not in `places/venues`: no pin; the row still shows.
35. Several pins share one spot: they fan out by a fixed small step.
36. The organizer confirms while a friend has a sheet open: the sheet stays open; the page changes under it.
37. The organizer undoes a confirm: the module's button goes back to its open state for everyone.

**Links (Trip 16)**
43. The text is not a link: refuse with the reason; make no call.
44. Any `https` link is accepted; a host other than Instagram or TikTok saves as site "other".
45. The same link twice, by one friend or two at once: the id comes from the address, so there is one card; the sheet brings it into view.
46. The reader fails after three tries: save without a title or a thumbnail.
47. The thumbnail fails to load: the card shows a tile with the site's name.
48. A friend removes their own link: it goes for everyone. An organizer removes any link.
49. No links yet: "No links yet."

**Splash and ship (Trip 14, Trip 15)**
38. The splash has no trip id (opened without `?t=` and none remembered): it shows no button.
39. The id on the splash is wrong: the app's own "not a trip" page answers (case 1).
40. `ship.sh` fails part way (rules sent, hosting not): it stops and names the step. A second run is safe: every step replaces, none appends.
41. The Lambda deploy fails or the AWS sign-in has expired: `ship.sh --with-reader` stops and prints the sign-in command. The app still works; case 16 covers a missing reader.

### 5.4 The retry story

Nothing in this build costs money per call, so nothing needs the owner's hand to retry. Reads reconnect by themselves, for as long as the page is open, and the page says "No connection" after 5 seconds. Sign-in tries 3 times, then stops with the reason. The link reader tries 3 times in all (0 s, 1 s, 3 s), then gives way to typed inputs. A write waits in the page while the connection is down; a write the rules refuse never retries and shows its reason. A confirm is a transaction: the SDK retries it against fresh data, and when another organizer got there first the page shows that result. `ship.sh` never retries a step; it stops and names it.

### 5.5 References checked

- On `origin/main`: `firebase.json`, `.firebaserc`, `.gitignore`, `README.md`, `public/index.html`. Checked with `git ls-tree -r origin/main`.
- In the working folder, to be committed by Trip 0: `docs/requirements.md`, `docs/trip-app/plan.md`, `design/app/README.md`, `public/designs/20/index.html`, `public/hype/`, `public/assets/hype.js`, `public/assets/hype.css`, `data/lineups/2027-feb-mar.json`, `data/lineups/2026-feb-mar.json`.
- Every other path in a ticket is new and is marked "new" there.
- UI strings in the tickets were copied from the mock's text on 23 Nov 2026.

Not proven before the build: that Airbnb and Booking.com answer a plain request with a title and a photo. Trip 8 proves it first, on real links, and case 16 holds either way.

### 5.6 Dependencies on other projects

None. This repo has one project.

### 5.7 Sizes

Sixteen tickets. None names more than five files besides tests and folder READMEs.

### 5.8 The builder keeps looking

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

## 6. Tests

The owner said "take it easy on the test" (23 Nov 2026). This section overrides the "Tests" line of every ticket.

- Keep only the tests that prove the risky rules: the database rules tests, and the header examples of the pure rule functions (`modules`, the last-year rule, the date counts, `linkId`).
- A header example covers the typical case and the one surprising case. Drop the rest.
- No tests for UI components, no snapshot tests, no end-to-end tests. Check each screen once by eye at 390 px wide, and write one line per screen in the pull request.
- Do not chase a flaky test. If a test fails for a reason outside the rule it checks, delete it and say so in the pull request.

Where they run:

- Header examples: Vitest, `npm test` in `web/`.
- Database rules: `web/tests/rules.test.ts`, `npm run test:rules` in `web/`. It starts the database emulator, runs the nine tests of Trip 2 and stops it (Java 21 is installed).

## 7. Not in this build

The itinerary, club tables, prices, comments, the lineup checker, offline copies, notifications, removing a stay option, adding a date option on the page, and a Directions button. The owner said: "mvp only", "don't add things extra".

## 8. Risks

| Risk | Effect | Answer |
|---|---|---|
| Airbnb refuses the reader | No photo or name from a link | Trip 8 runs early; typed inputs are built in (case 16) |
| The database instance or anonymous sign-in cannot be switched on from the command line | Trip 2 stops | The ticket stops with the one console page to open; nothing else waits on a person |
| A friend picks another friend's name | Wrong answers under a name | Accepted for a private crew; the organizer sees every answer by name |
| The repo is public | A committed trip id or name would leak | The trip file and the links stay in `local/`, which is git-ignored |

## 9. Tickets

Linear refused new issues on 23 Nov 2026 (the workspace is over its free issue limit), so the tickets are here. The Linear project "Travel · Trip app (design 20)" (P-JDA-48) holds the project page and the three milestones and links to this file.

One builder runs the tickets in order on the branch `trip-app`. Trip 8 and Trip 14 touch their own folders only; a second builder can take them.

| Done | Ticket | Milestone | Waits on |
|---|---|---|---|
| [x] | Trip 0 · Handoff on the branch | 1 | nothing |
| [x] | Trip 1 · App shell and ship script | 1 | 0 |
| [x] | Trip 2 · Database, sign-in and rules | 1 | 1 |
| [x] | Trip 3 · Create a trip | 1 | 2 |
| [x] | Trip 4 · Load the trip and pick the stage | 1 | 3 |
| [x] | Trip 5 · Invitation and who replied | 1 | 4 |
| [x] | Trip 6 · Reply with a name | 1 | 5 |
| [x] | Trip 7 · Dates | 2 | 6 |
| [ ] | Trip 8 · Link reader | 2 | 1 |
| [x] | Trip 9 · Stay | 2 | 7, 8 |
| [ ] | Trip 10 · Party data and the last-year rule | 2 | 3 |
| [ ] | Trip 11 · Parties | 2 | 6, 10 |
| [x] | Trip 12 · Map | 3 | 9, 11 |
| [x] | Trip 13 · Module states and the All set line | 1 | 4 |
| [ ] | Trip 14 · Splash button into the app | 3 | 4 |
| [ ] | Trip 15 · Ship | 3 | 12, 13, 14, 16 |
| [ ] | Trip 16 · Links | 3 | 6, 8 |

Milestones: 1 · A friend can join (Trip 0 to 6, and Trip 13). 2 · The three goals (Trip 7 to 11). 3 · Map, Links, splash, ship (Trip 12, 14, 15, 16).

Build order: Trip 13 is built right after Trip 4, because the home page needs it.

Skills rule (owner, 23 Nov 2026): every UI component is built with three UI skills, no exceptions: the Impeccable plugin (`impeccable:impeccable`), agent-skills `frontend-ui-engineering`, and the owner's hci-design method (`design/references/hci-design/SKILL.md` with `references/interaction.md` and `references/ui-patterns.md`). Apply its decision order to each screen and rate each screen "supported", "revise" or "not checked" in the pull request, one line per screen.

Checkpoints: after Trip 6, after Trip 11 and after Trip 14, run every named test and walk the page once on the emulator before going on.

### Trip 0 · Handoff on the branch

**Waits on:** nothing. **Size:** S.

**Goal.** The branch holds everything a builder must read. Today the design, the requirements and the party data are in the working folder only.

**Do.**
1. In `/Users/jideanene/claude/Travel`, cut `trip-app` from `origin/main`.
2. Commit these paths, and only these: `docs/requirements.md`, `docs/trip-app/plan.md`, `design/app/README.md`, `public/designs/20/`, `public/hype/`, `public/assets/hype.js`, `public/assets/hype.css`, `public/index.html`, `firebase.json`, `data/lineups/2027-feb-mar.json`, `data/lineups/2026-feb-mar.json`.
3. Add to `.gitignore`: `local/`, `public/app/`, `node_modules/`.
4. Write `AGENTS.md` (new): what to read and in what order, where code goes (section 3), the test rule (section 6), "the design is law", "no extras", and that the repo is public.
5. Push the branch and open one draft pull request, "Trip app (design 20)". Every later ticket adds to it.

**Leave untracked.** `text/`, `docs/hype-brief.md`, `docs/skills/`, `.impeccable/`, `public/mockups/`, `public/wireframes/`, the other folders in `public/designs/`, `data/lineups/2027-dec-feb.json` (wrong months), `data/lineups/2026-jan-feb.html`. They stay on disk, and Firebase still serves the ones under `public/`.

**Edge cases.**
1. A file outside the list is staged: check `git status` before the commit and unstage it.
2. The repo is public: search the staged diff for an email address, a phone number and a friend's full name. Remove any hit first.
3. `origin/main` moved: cut from its new tip.

**Failures.** A refused push stops the ticket with git's message. Never force-push.

**Tests.** None.

**Done when.** `git ls-tree -r origin/trip-app --name-only` lists every path in step 2, and the draft pull request is open.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; agent-skills `git-workflow-and-versioning`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 1 · App shell and ship script

**Waits on:** Trip 0. **Size:** M.

**Goal.** `/trip/<tripId>` serves an empty app page in the mock's look, and one command deploys the site.

**Design.** Mock lines 1 to 182: the font (Plus Jakarta Sans), colours, radii and spacing. Copy the values; invent no tokens.

**Do.**
1. A Vite + React + TypeScript app in `web/` (new), with `base: "/app/"`, built into `../public/app`.
2. `web/src/app/App.tsx` (new): one route, `/trip/:tripId`, that renders the page frame at phone width with the header line "Bali · Koh Phangan · Feb 2027".
3. `web/src/app/tokens.css` (new): the mock's values as CSS variables.
4. `firebase.json`: a rewrite from `/trip/**` to `/app/index.html`. Keep the `no-cache` header.
5. `scripts/ship.sh` (new): build `web`, then deploy. It accepts `--with-reader` and does nothing with it yet (Trip 8). Each step prints its name before it runs.
6. A `README.md` in `web/src/app/`, `features/`, `components/`, `lib/` and `types/` (section 3).

Do not deploy here. Check the rewrite with the hosting emulator.

**Reuse and refactor.** Nothing to move. The build writes only inside `public/app/`; the hype pages must work as before.

**Edge cases.**
1. (40) `ship.sh` fails part way: it stops at once and names the step. A second run is safe.
2. The build empties its output folder: the output path is `public/app` exactly, never `public/`.
3. `/trip/` with no id: the frame shows; Trip 4 adds the message.
4. `/`, `/hype/1/` and `/designs/20/` still load after the rewrite.

**Failures.** A failed step stops `ship.sh` with the step's name and exit code. No step retries.

**Tests.** None. Check once at 390 px wide that the frame matches the mock's background, font and header line; write the result in the PR.

**Done when.** The hosting emulator serves the app at `/trip/abc` and the hype page at `/`.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; the Impeccable plugin (`impeccable:impeccable`); the hci-design method (`design/references/hci-design`); agent-skills `frontend-ui-engineering`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 2 · Database, sign-in and rules

**Waits on:** Trip 1. **Size:** M.

**Goal.** The database exists, a phone signs in with no account, and the rules let each device write only what is its own.

**Read.** Section 4. It is the contract.

**Do.**
1. Create the default Realtime Database instance for `travel-ca8f9` with the Firebase CLI. Switch on Anonymous sign-in.
2. `database.rules.json` (new): the rules of section 4. Add the `database` entry and the emulator ports to `firebase.json`. `scripts/ship.sh` deploys the rules before hosting.
3. `web/src/types/trip.ts` (new): the type of the whole tree.
4. `web/src/lib/paths.ts` (new): one function per path. No other file builds a path from strings.
5. `web/src/lib/firebase.ts` (new): start the SDK and sign in anonymously; three tries, then return the reason.

**Reuse and refactor.** The paths are known in two places by force: `paths.ts` and the rules file. The tests below hold them together. Add no third place.

**Edge cases.**
1. (3) Sign-in fails: three tries (0 s, 1 s, 3 s), then the reason goes to the page.
2. (5) A device points itself at another member: allowed; this is how a second phone joins.
3. A device with no entry in `crew/devices` writes an answer: refused.
4. A wrong shape (an answer of "perhaps", a name of 200 characters, an unknown destination): refused.
5. The instance or Anonymous sign-in cannot be switched on from the command line: stop. Print the one console page to open and what to click. Do not continue with a fake.

**Failures.** A refusal reaches the page as a message with its reason (Trip 4 shows it). Sign-in has a count of three. The SDK reconnects by itself.

**Tests.** `web/tests/rules.test.ts` (new), against the emulator. Exactly these:
1. A list of `/trips` is refused.
2. A signed-in device reads one trip; a device that is not signed in does not.
3. A device writes its own entry in `crew/devices` and is refused another's.
4. A device writes an answer, a heart, an "in" mark and a reply under its member, and is refused under another member.
5. A device that is not an organizer is refused `dates/confirmed` and `stay/confirmed`.
6. A claim with a real key makes the device an organizer; a wrong key is refused.
7. Any read of `/tripSecrets` is refused.
8. Each wrong shape in edge case 4 is refused.
9. A show is edited or removed only by the member who added it, or by an organizer.

**Done when.** The nine tests pass, and the app signs in against the emulator.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; agent-skills `test-driven-development`, `api-and-interface-design`, `security-and-hardening`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 3 · Create a trip

**Waits on:** Trip 2. **Size:** M.

**Goal.** One command creates the trip from a local file and prints two links: one for the crew, one for the organizer.

**Do.**
1. `data/trip.example.json` (new, committed): the shape of a trip file with the mock's values. Name "Bali · Koh Phangan"; the note and who wrote it; season 2027-02-01 to 2027-03-31; destinations Bali and Koh Phangan; date options 13 to 23 Feb, 16 to 25 Feb, 19 Feb to 1 Mar; an empty list of crew names.
2. `data/places.json` (new, committed): the areas (Uluwatu, Canggu, Seminyak, Ubud, Munduk; Haad Rin, Ban Tai, Thong Sala, Srithanu) with a centre each; the centre of each destination; every venue named in the two lineup files, with its area and position. Take positions from OpenStreetMap and name the source in the file.
3. `scripts/create-trip.mjs` (new): reads `local/trip.json`, checks it, and writes `info`, `crew/expected`, `dates/options` and `places` with the Firebase CLI. The first run makes the trip id (20 random characters) and the organizer key, writes the key under `/tripSecrets`, and saves both in `local/trip.state.json`. It prints and saves in `local/links.txt`:
   - crew link: `https://travel-ca8f9.web.app/?t=<tripId>`
   - organizer link: `https://travel-ca8f9.web.app/trip/<tripId>?organizer=<key>`
4. `--emulator` writes to the emulator.

`local/` is git-ignored. No real name, id or key is committed.

**Reuse and refactor.** The check of the trip file is one function, `validateTripFile`. Nothing else repeats its rules.

**Edge cases.**
1. (8) The crew list is empty: allowed.
2. The file is missing, is not JSON, or lacks a field: stop and name the file and the field.
3. A date option ends before it starts, lies outside the season, or leaves out 22 February 2027: refuse and say which. Screen 2 says "Each includes the Full Moon Party, Mon 22 Feb."
4. A second run keeps the id and the key, replaces `info`, `crew/expected`, `dates/options` and `places`, and touches nothing else.
5. (13) A date option that has answers is removed from the file: the option goes; the page ignores the answers left behind.
6. Two crew names are equal: refuse and name them.
7. The Firebase CLI is not signed in: stop with its message and the sign-in command.

**Failures.** The script writes in one update, so nothing is half written. It stops with the reason and does not retry.

**Tests.** The examples in the header of `validateTripFile`: one good file, the empty crew list, and one for each refusal in edge cases 2, 3 and 6.

**Done when.** `node scripts/create-trip.mjs --emulator` on a copy of the example prints two links, and a second run prints the same two.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; agent-skills `test-driven-development`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 4 · Load the trip and pick the stage

**Waits on:** Trip 3. **Size:** M.

**Goal.** The page loads the whole trip with one listener, shows every failure with its reason, and knows where the trip stands.

**Design.** Screens 2, 4, 7 and 9 show the trip at each point; the app shows their sections as equals (exception 10). The header line on each is "Bali · Koh Phangan · Feb 2027".

**Do.**
1. `web/src/lib/useTrip.ts` (new): one listener on the trip. It returns loading, not found, no connection, or the trip.
2. `web/src/lib/db.ts` (new): the one write helper. It turns a refusal or a lost connection into a message. No feature calls the SDK directly.
3. `web/src/app/lib/stage.ts` (new; Trip 13 replaces it with `modules.ts`): the rule of where the trip stands, with the four-part header.
4. `web/src/app/TripPage.tsx` (new): a thin composition of the page, so its layout changes in one file. The modules are placeholders until their tickets.
5. `web/src/components/Notice.tsx` (new): one line for a failure or a notice, with an optional "Try again".

**Reuse and refactor.** Every later ticket reads through `useTrip` and writes through `db.ts`. A second listener or a direct SDK call is a finding.

**Edge cases.**
1. (1) The trip id is not in the database: "This link does not open a trip. Ask the organizer for the link." No retry.
2. (2) No connection on first load: say so after 5 seconds; the SDK keeps trying.
3. (9) The trip is half there: each module shows its empty state; nothing throws.
4. (36) The trip changes while a sheet is open: the sheet stays; the page updates under it.
5. (37) A confirm is undone: the modules go back with it.
6. A destination has no stay option: it does not keep the trip at `plan` once the others have confirmed stays.
7. (42) The date confirm is undone: Stay hides again, with its options and hearts kept.

**Failures.** Reads reconnect by themselves. A refused write shows its reason and never retries.

**Tests.** None here; Trip 13 holds the header examples of `modules`.

**Done when.** With the emulator: a good link shows the frame; a wrong id shows the message; stopping the emulator shows "No connection".

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; the Impeccable plugin (`impeccable:impeccable`); the hci-design method (`design/references/hci-design`); agent-skills `frontend-ui-engineering`, `test-driven-development`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 5 · Invitation and who replied

**Waits on:** Trip 4. **Size:** M.

**Goal.** A friend sees the whole invitation before replying, and sees who has replied.

**Design.** Screen 1. Words from the mock: "February 2027 · Full Moon Party Mon 22 Feb", "Bali · Koh Phangan", the note in quotation marks with "— JD", "6 of 8 replied · RJ and LC not yet", and the buttons "I'm in", "Maybe", "Can't make it".

**Do.**
1. `web/src/features/crew/lib/crew.ts` (new): `initials(name)` and `notReplied(expected, members)`, with headers.
2. `web/src/features/crew/api/crew.ts` (new): the read side: members, expected names, this device's member.
3. `web/src/features/crew/components/Invitation.tsx` (new): screen 1. The three buttons do nothing yet (Trip 6).
4. `web/src/components/Avatars.tsx` (new): a row of initials with a count. Every "who" list in the app uses it.
5. `TripPage` shows the invitation (screen 12/1) to a device that has no member, and the home page to one that has.

**Reuse and refactor.** `Avatars` is the only place that draws initials.

**Edge cases.**
1. (8) No expected names: the line reads "6 replied", with no "not yet" part.
2. Everyone replied: the line reads "8 of 8 replied".
3. Two names give the same initials: show both; no merge.
4. A name of one word, of three words, with an accent, or with an emoji: `initials` returns one or two letters, upper case, never empty.
5. The note is missing: the quotation block is not drawn.
6. More avatars than fit: show the first six and "+N".

**Failures.** None of its own; `useTrip` covers the read.

**Tests.** The header examples of `initials` (typical, one word, edge case 4) and `notReplied` (typical, empty expected list, all replied).

**Done when.** Screen 1 matches the mock at 390 px wide with seed data; the result is in the PR as text.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; the Impeccable plugin (`impeccable:impeccable`); the hci-design method (`design/references/hci-design`); agent-skills `frontend-ui-engineering`, `test-driven-development`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 6 · Reply with a name

**Waits on:** Trip 5. **Size:** M.

**Goal.** A friend replies with one or two taps and becomes a member. The organizer's link makes that phone the organizer.

**Design.** Screen 1 for the buttons. The sheet uses the look of the Add a place sheet on screen 5: a title, one field, one main button. Title: "Who are you?". Field label: "Your name". These two strings are new; add them to the exceptions in `design/app/README.md`.

**Do.**
1. `web/src/components/Sheet.tsx` (new): the bottom sheet of screens 5 and 8. Every sheet in the app uses it.
2. `web/src/features/crew/components/JoinSheet.tsx` (new): a tap on a reply opens it. It lists the expected names nobody has taken as buttons, then the taken ones under "Already replied", then the field.
3. `web/src/features/crew/api/crew.ts`: the write side: point this device at a member, create the member if new, save the reply.
4. The organizer link: when the address has `?organizer=<key>`, write the claim, remove the key from the address bar, and show the notice "Organizer view." as on screen 3.

**Reuse and refactor.** `Sheet` is shared with Trip 9 and Trip 11. Build it once, here.

**Edge cases.**
1. (4) A friend on a second phone taps their own name under "Already replied": the device points to that member; the earlier answers show.
2. (5) Two friends tap the same name: both devices point to one member. Allowed.
3. (6) A typed name is empty or longer than 24 characters: refuse with the reason under the field. A typed name equal to a listed one joins as that member.
4. (7) A member taps another reply later: it replaces the old one.
5. The reply is "Can't make it": the member is saved; the page shows the invitation with their reply marked, and the module buttons below it.
6. The organizer key is wrong: show "This organizer link is not valid." The friend can still join as a friend.
7. The organizer opens the link before joining: the join sheet comes first, then the claim.
8. The connection drops between the tap and the write: the reply shows as sending, then sends; a refusal flips it back with the reason.

**Failures.** One write per tap through `db.ts`. No automatic retry beyond the SDK's own queue.

**Tests.** None beyond rules tests 3, 4 and 6 of Trip 2.

**Done when.** With the emulator and two browser profiles: both join, each sees the other's initials, and the second profile can become the first one's member by tapping the name.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; the Impeccable plugin (`impeccable:impeccable`); the hci-design method (`design/references/hci-design`); agent-skills `frontend-ui-engineering`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 7 · Dates

**Waits on:** Trip 6. **Size:** M.

**Goal.** A friend answers the dates in one tap per option. The organizer confirms one option. The Dates button then shows the result, and the Stay button appears.

**Design.** Inside the Dates module (frame 12/3): screen 20/2 (friend) and 20/3 (organizer); the result on the button. Words: "Which dates work?", "Each includes the Full Moon Party, Mon 22 Feb.", "10 nights · 5 yes · 1 maybe · 1 no", "Most yes", "Yes", "Maybe", "No", "Not answered yet: LC", "Organizer view.", "3 have not answered: RJ, LC, SN", "Pick the dates", "said yes", "Confirm these dates", "13–23 Feb · confirmed". The mock's "next" rows ("Stay · 7 options", "Parties · 6 shows") are not built: Parties is an open section beside Dates, and Stay waits for the confirm (exceptions 9 and 10).

**Do.**
1. `web/src/features/dates/lib/dates.ts` (new): `summary(option, answers)` (nights and counts), `mostYes(options, answers)`, `notAnswered(members, answers)`, with headers.
2. `web/src/features/dates/api/dates.ts` (new): save an answer; confirm an option in a transaction; undo a confirm.
3. `web/src/features/dates/components/DatesBlock.tsx` (new): screen 2 for a friend, screen 3 for an organizer.

**Reuse and refactor.** `Avatars` draws "said yes". There is no `NextRow` and no `PinnedLine` (exception 3).

**Edge cases.**
1. (10) A member changes an answer: the new one replaces the old; the counts move at once.
2. (11) Two organizer devices confirm at once: the first wins; the second sees the confirmed state.
3. (12) The organizer confirms an option with no yes: allowed.
4. (13) An answer for an option that is gone, or with a wrong value: ignored in every count.
5. (14) After the confirm: the module still opens, shows the counts, and takes no new answers.
6. Two options tie for most yes: no "Most yes" mark.
7. There are no date options: the module reads "No dates to vote on yet."
8. Members who replied "Can't make it" are not counted in "not answered".
9. The organizer opens the confirmed Dates module: it shows a way to undo the confirm, with the mock's button style and the words "Change the dates".

**Failures.** A refused confirm (the device is not an organizer) shows the reason. The transaction retries against fresh data inside the SDK; nothing else retries.

**Tests.** The header examples of `summary`, `mostYes` (typical, tie, no answers) and `notAnswered` (typical, edge case 8).

**Done when.** The Dates module matches screens 20/2 and 20/3 in the frame of 12/3 at 390 px with seed data; a confirm in one browser profile moves the page in the other.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; the Impeccable plugin (`impeccable:impeccable`); the hci-design method (`design/references/hci-design`); agent-skills `frontend-ui-engineering`, `test-driven-development`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 8 · Link reader

**Waits on:** Trip 1. **Size:** M.

**Goal.** Given an Airbnb or Booking.com link, return the listing's name and photo. Prove first that the sites answer.

**Do.**
1. First, the proof: from a deployed copy of the function, read three real Airbnb links and three real Booking.com links. Write in the PR what each returned. If a site refuses every time, keep going: the fallback in Trip 9 covers it. Say so plainly in the PR.
2. `services/link-reader/parse.mjs` (new): `parseListing(html, url)` returns `{ name, photoUrl, area?, sleeps? }` from the page's Open Graph tags and title. Pure, with the four-part header.
3. `services/link-reader/handler.mjs` (new): a Lambda with a function URL. `GET ?url=…` returns `{ ok: true, name, photoUrl, area?, sleeps? }` or `{ ok: false, reason }`, always with status 200 for a read that ran.
4. `services/link-reader/README.md` (new): what it is, what it refuses, how it deploys.
5. `scripts/ship.sh --with-reader` deploys it with the AWS profile `zen`, region `us-east-2`, and prints the function URL. The URL goes into `web/.env.production`.

**Interface.** One call, one answer shape. `reason` is one of `not_allowed`, `unreadable`, `timeout`, `too_large`. The caller needs nothing else.

**Edge cases.**
1. (21) The address is not `https`, or its host is not an Airbnb or Booking.com host: `not_allowed`, with no outward request.
2. (21) The site redirects: follow at most 3, each to an allowed host; otherwise `not_allowed`.
3. (21) The page is larger than 512 KB: read the first 512 KB only.
4. (22) The site sends a challenge page or no title: `unreadable`.
5. The site takes longer than 6 seconds: `timeout`.
6. The call comes from another site: the CORS header allows `https://travel-ca8f9.web.app` and `http://localhost` only.
7. Many calls at once: reserved concurrency of 2 caps the cost.
8. The photo address is `http` or relative: return it as an absolute `https` address, or leave it out.
9. (41) The AWS sign-in has expired: `ship.sh` stops and prints `aws sso login --profile zen --use-device-code`.

**Failures.** The function never retries; the app does (Trip 9). It holds no secret and stores nothing.

**Tests.** `services/link-reader/parse.test.mjs` (new): the header examples of `parseListing` against three saved pages (one Airbnb, one Booking.com, one challenge page). A unit test of the host check for edge cases 1 and 2. No network in tests.

**Done when.** The proof is in the PR, and the deployed URL answers one allowed link and refuses `https://example.com`.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; agent-skills `api-and-interface-design`, `test-driven-development`, `security-and-hardening`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 9 · Stay

**Waits on:** Trip 7, Trip 8. **Size:** M.

**Goal.** Friends heart the places they like, add a place by pasting a link, and the organizer confirms one stay for each destination.

**Design.** Screen 4 (friend), 5 (add), 6 (organizer). Words: "Where do we stay?", "Heart the places you like.", "Bali", "Koh Phangan", "Uluwatu · sleeps 10 · added by KA", "Open listing", "Add a place", "Paste an Airbnb or Booking.com link.", "Link", "Add to Bali", "Confirm a stay", "Confirm this stay". The Stay button's result line reads "Cliffside villa · confirmed".

**Do.**
1. `web/src/features/stay/lib/stay.ts` (new): `stayId(url)` (the address without its query string, made into an id), `isListingLink(text)`, with headers.
2. `web/src/features/stay/api/stay.ts` (new): read a link through the reader (three tries: 0 s, 1 s, 3 s; 8 s each); add an option; set and clear a heart; confirm a stay in a transaction; undo a confirm.
3. `web/src/features/stay/components/StayBlock.tsx` (new): the two lists, and the organizer's view of screen 6.
4. `web/src/features/stay/components/StayCard.tsx` (new): photo, name, the line of facts, "Open listing", who hearted, the heart with its count.
5. `web/src/features/stay/components/AddPlaceSheet.tsx` (new): screen 5.

The block renders only when dates/confirmed exists (case 42).

**Reuse and refactor.** Uses `Sheet`, `Avatars`. The area list comes from `places/areas`; do not type it again.

**Edge cases.**
1. (15) The text is not an Airbnb or Booking.com link: show "Paste an Airbnb or Booking.com link." in the error style and make no call.
2. (16) The reader fails three times, or returns no name: the sheet shows inputs for the name, the area (a pick list for the chosen destination) and "sleeps" in the positions of screen 5. "Add to Bali" works with a name alone.
3. (16) The reader returns a name and no area: the area is a pick list; the rest is as read.
4. (17) The listing is already in the list: the sheet closes and that card is brought into view. Nothing is added.
5. (17) Two friends add the same link at once: one record, because the id comes from the address. `addedBy` is the first writer.
6. (18) The photo fails to load: show the area's scenery photo from `public/` media; the mock's stand-ins are the pattern.
7. (19) A heart with no connection: it shows at once and sends later; a refusal flips it back with the reason.
8. (20) Two organizers confirm for one destination at once: the first wins.
9. A destination has no option: its heading shows with "No places yet." and the Add a place button.
10. A stay is confirmed: its card shows as confirmed; hearts stay open; the organizer sees "Change the stay".
11. The name from the reader is long: two lines, then cut.

**Failures.** The reader is free to call. Three tries, then inputs. Every failure shows in the sheet with its reason; the friend can always finish by typing.

**Tests.** The header examples of `stayId` (typical, with a query string, the same listing on a country domain) and `isListingLink` (typical, a non-listing address, plain text).

**Done when.** Screens 4, 5 and 6 match the mock at 390 px; with the reader switched off the friend can still add a place.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; the Impeccable plugin (`impeccable:impeccable`); the hci-design method (`design/references/hci-design`); agent-skills `frontend-ui-engineering`, `test-driven-development`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 10 · Party data and the last-year rule

**Waits on:** Trip 3. **Size:** M.

**Goal.** The trip holds this year's shows and last year's shows, and one function decides where the last-year line appears.

**Do.**
1. `scripts/seed-parties.mjs` (new): reads `data/lineups/2027-feb-mar.json` into `parties/shows` and `data/lineups/2026-feb-mar.json` into `parties/lastYear`, for the trip in `local/trip.state.json`. `--emulator` as in Trip 3. `scripts/ship.sh` runs it after the rules.
2. `web/src/features/parties/lib/shows.ts` (new): `showId(show)` and `byPlaceVenueDate(shows)` (destination, then venue, then date), with headers.
3. `web/src/features/parties/lib/lastYear.ts` (new): `lastYearLines(shows, lastYear, season)`, the rule in section 3, with the header.

Field map from the files: `place` becomes `destination`; `artist`, `venue`, `area`, `date` and `verified` keep their names; `source` becomes `link` when it is an address.

**Reuse and refactor.** `showId` is used by the seed and by Trip 11's "same party" check. One function, two callers.

**Edge cases.**
1. (23) The seed runs twice: same ids; no duplicates; friends' shows and "in" marks stay.
2. (24) A show left the file: the seed does not delete it.
3. (25) `verified` is false: the show keeps `verified: false`.
4. (26) A venue has a show this year on the weekend: no line. Last year has nothing: no line.
5. A weekend spans two months (Fri 26 Feb to Sun 28 Feb, Fri 26 Mar to Sun 28 Mar): one weekend.
6. A last-year show fell on a weekday: it belongs to no weekend line and is not shown.
7. A file is missing, is not JSON, or has a show with no date: stop and name the file and the entry. Write nothing.
8. A venue name differs by case or spaces between the two files: treat as one venue.
9. The `artist` text in the file holds notes in brackets: keep the text as it is; the row cuts it (Trip 11).

**Failures.** One update per file; nothing half written. No retry.

**Tests.** The header examples of `lastYearLines`: screen 7's case (Sat 6 and Sun 7 Feb 2027 at Savaya give Sat 7 Feb Nic Fanciulli and Sun 8 Feb Francis Mercier), edge cases 4, 5 and 6. The header examples of `showId` (typical, edge case 8).

**Done when.** After the seed on the emulator, `lastYearLines` on the real data returns the Savaya line of screen 7.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; agent-skills `test-driven-development`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 11 · Parties

**Waits on:** Trip 6, Trip 10. **Size:** M.

**Goal.** A friend sees who is playing, says "I'm in" in one tap, and adds a party.

**Design.** Screen 7 and screen 8. Words: "Who's playing", "Add", "Bali", "Savaya · Uluwatu", "Sat 6 – Sun 7 Feb. Nothing announced yet. Here is who played this weekend last year:", "4 in", "I'm in", "not confirmed", "Be the first in", "1 in · added by KA", "Add a party", "It joins the list for everyone, with your initials.", "Venue", "Date", "Who is playing", "Link (optional)", "Save", "Shows in the list as "added by KA"".

**Do.**
1. `web/src/features/parties/api/parties.ts` (new): set and clear "in"; add a show; edit and remove a show.
2. `web/src/features/parties/components/PartiesBlock.tsx` (new): destination, venue, then rows by date, with the last-year lines in place.
3. `web/src/features/parties/components/ShowRow.tsx` (new): the date tile, the artist, who is in, the button. A row the member added, and every row for an organizer, shows "Edit".
4. `web/src/features/parties/components/LastYearLine.tsx` (new): the grey block of screen 7.
5. `web/src/features/parties/components/AddPartySheet.tsx` (new): screen 8. It also edits, with "Remove" at the foot.

**Reuse and refactor.** Uses `Sheet`, `Avatars`, `showId`, `byPlaceVenueDate`, `lastYearLines`.

**Edge cases.**
1. (27) A field is missing, the date is outside 1 Feb to 31 Mar 2027, or the link is not an address: refuse with the reason next to the field.
2. (28) The party matches a show (same venue, date and artist, ignoring case and spaces): close the sheet and bring that row into view. Add nothing.
3. (29) A friend removes their party: its "in" marks go in the same write.
4. (30) The artist text is long: two lines, then cut.
5. (31) Nobody is in: "Be the first in".
6. A friend edits a party while another taps "I'm in": both writes land; they touch different records.
7. A friend's party names a new venue: it shows under that venue name in its destination.
8. There are no shows at all: "Nothing announced yet." and the Add button.
9. "I'm in" with no connection: it shows at once and sends later; a refusal flips it back with the reason.
10. A show's date is in the past on the day the page opens: it still shows; the trip is the record.

**Failures.** One write per tap through `db.ts`. A refused edit (not the adder, not an organizer) shows the reason.

**Tests.** None beyond rules test 9 of Trip 2 and the examples of Trip 10.

**Done when.** Screens 7 and 8 match the mock at 390 px with the seeded data; a party added in one browser profile shows in the other as "added by" its initials.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; the Impeccable plugin (`impeccable:impeccable`); the hci-design method (`design/references/hci-design`); agent-skills `frontend-ui-engineering`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 12 · Map

**Waits on:** Trip 9, Trip 11. **Size:** M.

**Goal.** A real map shows the stay options and the venues. A tap on a pin shows its name and opens its card.

**Design.** Screen 10. Words: "Bali", "Koh Phangan · 3 pins", and the card "Savaya / Club on the cliffs · next show Sat 13 Feb". The mock loads Leaflet with OpenStreetMap tiles (lines 7 and 8).

No stay pins and no stay line while the dates are not confirmed.

**Do.**
1. `web/src/app/lib/pins.ts` (new): `pins(trip)` builds one list from stay options (at their area's centre) and venues, with the header.
2. `web/src/features/map/lib/fan.ts` (new): `fanOut(pins)` moves pins that share a spot by a fixed small step.
3. `web/src/features/map/components/TripMap.tsx` (new): the map, the destination switch, the pins. It draws the pins it is given and knows nothing of stays or shows.
4. `web/src/features/map/components/PinCard.tsx` (new): the open card. Its tap opens the stay card or the venue's rows.
5. `TripPage`: the map opens from the Map module button and from "See on the map ›" in Parties (12/5).

**Reuse and refactor.** The map feature imports no other feature; the app passes the pins in. That is why `pins.ts` is in `app/`.

**Edge cases.**
1. (32) The tiles do not load: a notice, and under it the pins as a list that opens the same cards.
2. (33) A stay's area is unknown: its pin sits at the destination's centre.
3. (34) A friend's party has a venue with no position: no pin.
4. (35) Several pins share one spot: `fanOut` spreads them; every pin can be tapped.
5. A destination has no pins: the map shows the destination with "No pins yet."
6. A venue has no coming show: its card shows the venue name and area only.
7. The friend switches destination while a card is open: the card closes.

**Failures.** Tiles are free and load by themselves; the library retries a tile. After 8 seconds with no tile, show the notice and the list.

**Tests.** The header examples of `pins` (typical, edge cases 2 and 3) and `fanOut` (one pin, three on one spot).

**Done when.** Screen 10 matches the mock at 390 px; with the network blocked for the tile host the list shows.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; the Impeccable plugin (`impeccable:impeccable`); the hci-design method (`design/references/hci-design`); agent-skills `frontend-ui-engineering`, `test-driven-development`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 13 · Module states and the All set line

**Waits on:** Trip 4. Built right after Trip 4, because the home page needs it. **Size:** S.

**Goal.** The home page shows the module buttons in their fixed order, each with its state line, and "All set" when the dates and every stay are confirmed.

**Design.** Screen 12/2: the home page and the state lines ("Tap to answer", "7 options · heart one", "6 shows · I'm in"). The result lines "13–23 Feb · confirmed" and "Cliffside villa · confirmed". "All set" from screen 20/9. No stay pins and no stay line while the dates are not confirmed.

**Do.**
1. `web/src/app/lib/modules.ts` (new, replaces `stage.ts`): `modules(trip, memberId)`, the rule in section 3, with the header.
2. `web/src/app/TripPage.tsx`: the home page of screen 12/2 built from `modules()`. One module open at a time; all start closed.

**Reuse and refactor.** The state lines read through the features' `lib` functions as they arrive (the date counts, the confirmed stay, the shows). The rule formats; it decides nothing new.

**Edge cases.**
1. One result line for each destination with a confirmed stay.
2. (42) The date confirm is undone: the Stay button disappears; its data stays.
3. (37) A confirm is undone: the button's line goes back to its open state.
4. The dates are confirmed and nobody has added a place yet: Stay is present, and the trip is not "All set".
5. The confirmed option no longer exists: the dates count as not confirmed.

**Failures.** None of its own.

**Tests.** The header examples of `modules`: before the dates are confirmed (no Stay), after (Stay present), everything confirmed (result lines and "All set").

**Done when.** Screen 12/2 matches at 390 px with seed data, and a confirm in one browser profile changes the buttons in the other.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; the Impeccable plugin (`impeccable:impeccable`); the hci-design method (`design/references/hci-design`); agent-skills `frontend-ui-engineering`, `test-driven-development`.

### Trip 14 · Splash button into the app

**Waits on:** Trip 4. **Size:** S.

**Goal.** The hype splash carries the trip id and shows one button that opens the trip.

**Read.** `public/assets/hype.js` and `public/hype/1/index.html`. The splash asks nothing else; this is its only button.

**Do.**
1. `public/index.html`: keep the random choice between `/hype/1/` and `/hype/13/`, and pass `?t=<tripId>` on to the page it picks.
2. `public/assets/hype.js`: one new function, `enter()`. It reads the trip id from `?t=`, or from the id remembered on this phone, and remembers it. With an id it adds one button, "OPEN THE TRIP", that goes to `/trip/<tripId>`. Options 1 and 13 call it.
3. `public/assets/hype.css`: the button, in the splash's own type (Anton) and the yellow of the sound button, at the bottom centre, clear of the sound button and of the bottom panels.

**Reuse and refactor.** The button is one function in `hype.js`. Do not copy it into the two pages. The first tap anywhere turns the sound on today (`sound()` in `hype.js`); a tap on the new button must open the trip and not be swallowed by that.

**Edge cases.**
1. (38) No id in the address and none remembered: no button.
2. (39) The id is wrong: the app's "not a trip" page answers.
3. The phone blocks storage: the button still works from `?t=`; nothing is remembered.
4. The id in the address differs from the remembered one: the address wins and is remembered.
5. The other options under `/hype/` are opened by hand: no button there.
6. The id holds a character outside letters, digits, `-` and `_`: ignore it.

**Failures.** None; there is no call.

**Tests.** None. Check once on a phone-size window that the button does not cover the WASTED tile or the sound button, and that it opens the trip.

**Done when.** `/?t=abc` lands on option 1 or 13 with the button, and the button opens `/trip/abc`.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; the Impeccable plugin (`impeccable:impeccable`); the hci-design method (`design/references/hci-design`); agent-skills `frontend-ui-engineering`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 15 · Ship

**Waits on:** Trip 12, Trip 13, Trip 14, Trip 16. **Size:** S.

**Goal.** The app is live for the crew, and the owner holds two links.

**Do.**
1. Run the whole flow once on the emulator with two browser profiles, one of them the organizer: join, answer, confirm dates, add a place by link, heart, confirm both stays, "I'm in", add a party, add a link, open the map, reach "All set". Write what happened at each step in the PR as text.
2. Write `local/trip.json`. Use the owner's names and date options if he gave them. If not, use the mock's three date options and an empty name list.
3. Fill section 5.3 of this plan with the cases the build found, and tick the ticket index.
4. Mark the pull request ready and say what was not proven (for example, a site that refused the link reader).
5. Hand the owner one line: `sh scripts/ship.sh --with-reader`. After he runs it, run `node scripts/create-trip.mjs` and give him the two links from `local/links.txt`.

**Edge cases.**
1. (40) The deploy stops part way: the script names the step; run it again.
2. (41) The AWS sign-in has expired: the script prints the sign-in command. The app works without the reader.
3. The trip already exists from a test: `create-trip` keeps its id; delete `local/trip.state.json` first for a clean trip, and say so.
4. The hype pages changed on `main` during the build: merge `main` into the branch before the PR is marked ready.

**Failures.** Nothing retries by itself. Every stop names its step.

**Tests.** The full set from the earlier tickets passes: rules tests and header examples.

**Done when.** The PR is ready, the owner has the one command, and after the deploy the crew link opens the splash and the trip.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; agent-skills `shipping-and-launch`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.

### Trip 16 · Links

**Waits on:** Trip 6, Trip 8. **Size:** M.

**Goal.** A friend saves a cool Instagram or TikTok find for Bali or Koh Phangan, and everyone sees it in the Links module.

**Design.** The mocks do not draw Links (exception 3). Build it in the module frame of 12/3 and from the Add a place sheet's pattern (20/5). Words: "Links", "Add a link", "Paste an Instagram or TikTok link.", "Link", "Bali", "Koh Phangan", "What is it?", "Save", "added by KA", "No links yet."

**Do.**
1. `web/src/features/links/lib/links.ts` (new): `linkId(url)` (the address without its query string, made into an id) and `siteOf(url)`, with headers.
2. `web/src/features/links/api/links.ts` (new): read a link through the reader (three tries: 0 s, 1 s, 3 s); add a link; remove a link.
3. `web/src/features/links/components/LinksModule.tsx` (new): cards grouped by Bali and Koh Phangan: the thumbnail or the site's name, the note or the title, "added by KA". A tap opens the link in a new tab.
4. `web/src/features/links/components/AddLinkSheet.tsx` (new): the shared `Sheet` with the Link field, the destination chips, the optional "What is it?" note and "Save".
5. `database.rules.json`: the `links/items` rules of section 4. `services/link-reader/` also accepts `instagram.com` and `tiktok.com` and returns the title and the photo when it can.

**Edge cases.** Cases 43 to 49.

**Failures.** The reader is free to call. Three tries, then the link saves without a title or a thumbnail. A refused write shows its reason.

**Tests.** The header examples of `linkId` (typical, the same link with a query string).

**Done when.** A link added in one browser profile shows in the other as "added by" its initials; with the reader switched off the link still saves.

**Skills.** agent-skills `incremental-implementation`; `engineering-ethos`; `explain-clearly`; the Impeccable plugin (`impeccable:impeccable`); the hci-design method (`design/references/hci-design`); agent-skills `frontend-ui-engineering`, `test-driven-development`.

The edge cases above are the ones found before the build. Find the rest: for every call, every write and every state, ask what happens when it is missing, fails, repeats or races, and record each case you handle in the PR body.
