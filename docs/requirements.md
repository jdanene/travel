# Travel app requirements (v1)

Status: draft for the owner's review, 23 Nov 2026.

Sources: the owner's scope note and the ChatGPT draft (both in `text/requirements.md`), and research on existing apps (section 11).

## 0. What matters (owner, 23 Nov 2026)

The app has three main goals. Home shows them as module buttons, with Links and the Map, and each must take one tap to answer.

1. **Dates:** agree on the days. The trip is in February and March 2027. The Full Moon Party on 22 February 2027 is the anchor.
2. **Stay:** agree where to sleep. A friend adds an option by pasting an Airbnb or Booking.com link. Friends tap a heart. The organizer confirms. Stay shows only after the organizer confirms the dates. Until then the page has no Stay block.
3. **Parties:** see who is playing and who is in. Parties are open from the start, before the dates are settled. Where a venue has nothing announced for a date, the page says "Nothing announced yet. Here is who played this weekend last year:" and lists last year's acts for the same weekend. One page lists place, venue, date and artist, with this year and last year together. Each show has an I'm in button. Any friend can add a party: an Add a party button takes the place, the venue, the date and who is playing, and an optional link. The new entry shows who added it. A friend can edit or remove an entry they added, and the organizer can edit or remove any entry.

Dates, Stay, Parties and Links are equal modules. The only rule of order: Stay shows after the organizer confirms the dates.

Everything else is a side journey: votes on other things, the itinerary, club tables. A side journey is one tap away and never sits on Home. Where a later section conflicts with this one, this section wins.

### The first version (MVP)

The first version is small. It has six things:

1. Join the trip from one link, with a name.
2. Dates.
3. Stay.
4. Parties.
5. A map of the places: the stay options and the party venues. A tap on a pin shows its name and opens its card. The map is the one fancy thing in the app. Nothing else may be fancier.
6. Links: a friend pastes an Instagram or TikTok link, picks the place, and it shows for everyone.

Nothing else goes into the first version, not even small extras. There is no Directions button anywhere in the app (owner, 23 Nov 2026).

The side journeys come later, one at a time, after the crew uses the first version. Sections 4 to 15 below describe the full app. They are the backlog, not the first build.

### The look

The app is as clean and easy as Airbnb. This is a requirement, not a preference.

- One job on each screen, and one main button.
- Large photos with rounded corners. White space around everything.
- Few words, in plain sentences. No jargon, no labels the crew must learn.
- One accent color. No heavy borders, no clutter, no decoration.
- A friend who opens the link for the first time can answer in one tap, without instructions.
- The game-cover style belongs to the hype page, with two exceptions in the app (owner, 24 Nov 2026): the title block under the cover uses the hype title's type, and the cover is the hype collage. Everything else in the app keeps the clean look.

### What "like Paperless" and "like Partiful" mean

When the owner names Paperless Post or Partiful, he means how they work, not how they look. Borrow the mechanics. Keep the app's own clean look.

- One link opens one page. There is no app to learn.
- A friend sees everything before replying, and replies on that page with a name only.
- The reply can ask the questions: which dates, which stay, which parties.
- Everyone sees who has replied and what they answered.
- The page is made of simple blocks, one action in each.
- The organizer uses the same page, with a confirm action on each block, and can see who has not answered.
- The page moves forward as the organizer confirms things.

Do not copy their paper cards, serif type, gradients or party styling. Every design must still meet all of section 0.

## 1. Purpose

The app helps one friend group plan a trip together. The group is guys in their 30s. Their trips mix club nights, day parties, adrenaline activities and beach days.

The app does two jobs, in this order:

1. Save the TikToks, Reels and links that friends find, sorted by place, so the group can check them.
2. Plan the trip: where and when, who is coming, what the group does each day, and who sits at which table.

The app shows prices for information: ticket prices and table prices. It does not track money. It has no splits, deposits, payments or balances.

## 2. People

- **Organizer:** creates the trip, invites friends, confirms the place, dates and plans, and manages the guest list.
- **Friend:** joins from the invite link, saves ideas, votes, RSVPs and joins tables.
- **Booking owner:** a friend whom the organizer puts in charge of a booking or a table. The booking owner keeps its details and its guest list.

## 3. Platform

1. The app is a website built for phones. It works in the phone's browser. Nobody installs an app.
2. A friend can add the app to the home screen. Then it opens like an app.
3. The trip opens without signal. The phone keeps the last copy of the trip, because clubs and beaches often have poor signal.
4. Stack: Firebase Hosting, Firebase Realtime Database, Firebase Authentication, and one small AWS Lambda that reads links (section 6.4).
5. The map uses OpenStreetMap.

## 4. Trip and invites

1. The organizer creates a trip with a name. The place and the dates can be set now, or settled by a vote (section 5).
2. The trip has one private invite link. The link works in any phone browser.
3. A friend joins with a name only. There is no password and no phone number.
4. A friend RSVPs Going, Maybe or Can't go, and can change the answer later.
5. A friend enters their own arrival and departure dates.
6. For each plan, the app shows who is in town that day, from each friend's own dates.
7. The organizer can remove a friend, reset the invite link, and make a friend a booking owner.
8. The app shows a plan's details before it asks for an RSVP.

## 5. Settle where and when

**The first trip:** the place is settled. The group goes to Indonesia and Thailand, so this trip skips the place vote. The dates are still open, so the date poll comes first. The trip's areas start as Bali (Uluwatu, Canggu) and Koh Phangan, Thailand, for the Full Moon Party. The organizer can add more. A trip can cover more than one country.

### 5.1 Where: the place vote

1. The organizer opens the place vote and adds options, for example Bali, Tulum and Ibiza. Friends can add options too, unless the organizer locks the list.
2. Each place option is a small board. Friends save TikToks and Reels to it to sell the place.
3. Each friend taps I'm in on every place they would go. A friend can also star one place as their first choice.
4. For each place, the vote shows how many friends are in, who they are, and how many starred it. It also shows who has not voted.
5. The organizer confirms one place. On a tie, the organizer decides.

### 5.2 When: the date poll

0. When no dates are on the table yet, the poll starts with a rough round. The organizer picks a window, for example March to June, and a trip length, for example 8 nights. Each friend marks the weeks they cannot travel. The app then lists the ranges of that length that the most friends can make. The organizer picks two to four of them as the options.
1. The organizer opens the date poll and adds date ranges, for example 12–19 March and 2–9 April. A friend can suggest a range. The organizer adds it as an option.
2. Each friend answers every range: Yes, Maybe or No.
3. The poll shows a grid of ranges and friends. Each range shows its count of Yes and Maybe answers. The app marks the range with the most Yes answers, then the most Maybe answers.
4. The organizer confirms one range. Each friend's answer for that range becomes their trip RSVP: Yes is Going, Maybe is Maybe, No is Can't go.

### 5.2a Friends who come at different times

1. The date poll settles the **core dates**: the days when the whole group is there. This is the main decision. The group agrees on the core dates first, and each friend books around them.
2. Going means the friend is there for all the core dates. A friend who can make only some of them answers "Part of it" and marks which days.
3. Each friend also enters their own arrival and departure dates. A friend can arrive before the core dates or stay after them. Those extra days are optional.
4. The big plans go on the core dates: the must-do events, the main shows and the table nights. The app warns the organizer when a plan with tables falls outside the core dates.
4. The trip page has a Who's here timeline: one row per friend, one column per day, with the area each friend is in. It shows the days when the most friends overlap.
5. Each day in the itinerary shows who is in town. A plan asks for RSVPs only from friends who are there that day.
6. The organizer sees the overlap before confirming big nights, so table nights land on days when most of the group is there.
7. When a friend changes their dates, the app removes them from plans and tables on days they are no longer there, and lists this under What changed.

### 5.2b Who's playing

1. Who's playing helps pick the dates, so friends can add shows before the dates are set.
2. A show has an artist, a venue, an area and a date. It also holds what a friend needs to decide:
    - **Who's playing:** the headliner and the other artists on the bill.
    - **Tickets:** the ticket link, the price or price range, and the status (On sale, Sold out, Not on sale yet, Free entry).
    - **Tables:** the table prices or minimum spend for each table type, with the number of guests each covers, and how to book (a link or a promoter contact).
    - Each price shows its currency, its source and the date it was checked. Prices are for information only. The app does not split or track them.
    - The lineup checker fills in what the venue or ticket page publishes. Many venues give table prices only on request, so the show says "Ask the venue" until a friend enters the quote. A friend adds it by pasting the event link (a club's page, Resident Advisor, an Instagram post) and filling in the artist and date. The link reader fills in the page title when it can.
3. Friends tap I'm in on the shows they want to see.
4. The date poll shows, under each date range, the shows that fall inside it and how many friends want each. A range with a must-see show stands out.
5. The Who's here timeline shows the shows on their days, so each friend sees which ones they would be in town for.
6. After the dates are confirmed, shows outside the trip window move to a "Missed" list. The organizer turns the wanted ones into plans or club nights.
7. The app has a lineup board. It lists shows by area and venue, then by date: date, artist, venue.
8. The board holds two seasons side by side: this season and the same weeks last year. Last year's list is the owner's file, `data/lineups/2026-jan-feb.html` (January and February 2026). For each venue, a friend sees who played each weekend last year next to who is announced this year.
9. Last year's list helps before this year's lineups are out. It shows which venues book big names and on which weekends, such as New Year week at Savaya.
10. The board marks artists who appear in both years, and weeks where this year has no announcement yet ("Not announced").
11. Each show on the board has the same I'm in button. A show a friend adds by link joins the board.
12. The board shows when it was last checked, for example "Checked 23 Nov".
    - **The check runs when a friend opens the app.** If the last check is more than 24 hours old, the app asks the lineup checker to run. There is no timer and no scheduled job.
    - **The lineup checker is a second job of the link reader Lambda.** It reads the events page of each venue on the trip's venue list, finds dated shows, and writes new and changed shows to the board.
    - **One check at a time.** The app sets a lock in the database before it asks. A second friend who opens the app in the same minute starts nothing.
    - **Nobody waits.** The board shows the stored list at once. New shows appear when the check ends.
    - **Reading the pages.** Each venue lays out its page differently, so the checker sends the page text to a small AI model (Claude Haiku) that returns date, artist and venue. A check of about 15 venues costs about one cent, so at most about 30 cents a month.
    - **Limits.** The checker never adds a show without a date. If a venue's page fails or blocks the checker, the board says "Could not check" for that venue and keeps its old shows. The checker tries a failed page twice more, then waits for the next day.
    - The organizer edits the venue list, and can fix or remove any show the checker added.
13. If a refresh finds a show changed or canceled, the board keeps the show, marks it, and lists it under What changed.

### 5.2c Must-do events

1. The organizer can mark a show or event as a must-do. A must-do has a fixed date.
2. The date poll offers only ranges that include every must-do date. The rough round starts from those dates instead of from a window.
3. The Who's here timeline marks the must-do days, so each friend plans their own arrival around them.
4. First trip: the Full Moon Party on the 22nd is a must-do (22 February 2027, Haad Rin, Koh Phangan, Thailand). The trip is in February and March 2027.

### 5.3 How both votes run

1. Both votes can run at the same time.
2. Each vote can have a closing time, shown on the vote.
3. The organizer sees who has not voted. A Copy reminder button copies a message for the group chat that names them. (v1 has no push notifications.)
4. Friends see live results and can change their votes until the vote closes.
5. If the best dates depend on the place, the organizer confirms the place first, then the dates.
6. The confirmed place and dates show at the top of the trip.

### 5.4 What the group settles next

After the place and the dates, the trip page leads the group through three more steps, in this order:

1. **Artists:** who the group wants to see. Friends save event listings, lineups, TikToks and Reels as Artists and shows ideas. Each idea can hold the artist, the venue and the date. Friends tap I'm in. The organizer confirms a show, and it becomes a plan or a club night.
2. **Stay:** where the group sleeps. Friends save villas and hotels as Stays ideas. The organizer puts the best ones to a vote and confirms one. If the trip covers several areas, each area gets its own stay.
3. **Things to do:** a loose list for each area, for example Uluwatu, Canggu and the Gili Islands. The list is the ideas friends saved to that area: the TikToks, Reels and links, sorted by Interested count. It needs no vote. The group browses it and the organizer turns the favorites into plans.

A step is never locked. Friends can save ideas for any step at any time.

## 6. Save ideas

### 6.1 Saving

1. Anyone in the trip can save an idea. An idea is a link, a note, or both.
2. Saving takes one step: paste the link, add a short note such as "Sunday day party", and save. The idea appears at once.
3. Details come later. Anyone can add the venue, area, date and category.
4. The app accepts TikTok videos, Instagram posts and Reels, Google Maps links, event listings and any other web link.
5. On Android, a friend who added the app to the home screen can share a link from TikTok or Instagram straight into the trip.
6. On iPhone, a friend taps Paste link. iPhone does not let websites join the share menu.

### 6.2 Categories

Artists and shows, Clubs, Day parties, Restaurants, Beaches, Adrenaline (surf, quad bikes, diving, cliff jumps), Stays, Other.

Each idea also belongs to an area of the trip, for example Uluwatu. The organizer sets up the areas. An idea with no area sits under "Anywhere".

The app suggests a category from words in the note. The person can change it.

### 6.3 Previews

1. A TikTok idea shows TikTok's own player. Tap to play.
2. An Instagram idea shows Instagram's own embed.
3. A Google Maps idea shows the place name and a pin on the map.
4. Any other link shows the page title when the page gives one.
5. If a preview fails, the idea keeps its link and note. The card says "No preview" and still opens the link.
6. The app never copies content out of Instagram or TikTok. Their terms forbid automated collection.

Limits found in research (23 Nov 2026):

- TikTok's embed service no longer returns the caption or a thumbnail. The player is all it gives.
- Instagram's embed service needs a Meta app review, and it has returned no thumbnail since 3 Nov 2025.
- So in v1 the venue and area come from the friend's note or from a Maps link, not from the video.

### 6.4 The link reader (AWS Lambda)

1. When a friend saves an idea, the link reader opens the link and follows its redirects.
2. It finds the TikTok video ID, the Instagram post code, or the Google Maps place name and pin.
3. If a request fails, it tries twice more, then marks the idea "No preview".
4. It never delays the save. The app saves the idea before the reader starts.

### 6.5 Duplicates

1. Two links to the same TikTok video, Instagram post or Maps place count as one idea.
2. When a friend saves a duplicate, the app opens the existing idea. Their note becomes a comment there.
3. Votes, Interested taps and comments stay together on one idea.

### 6.6 Browsing

1. Every idea shows who saved it and when.
2. Friends filter ideas by category, area and date.
3. The map shows every idea that has a location.
4. A friend taps Interested with one tap, and can comment.
5. The organizer can turn an idea into a plan, or start a club night from it. The plan keeps the original link, the venue details and the list of interested friends.

## 6a. The map

1. The trip has a Map tab. It opens on the whole trip: one marker for each area, for example Bali and Koh Phangan, with the dates the group is there and the number of saved things.
2. A tap on an area zooms in. The area shows a pin for each thing with a location: the stay, clubs and venues, beaches, restaurants, adrenaline spots, and saved ideas.
3. Pins differ by category in both icon and color. Confirmed plans and the stay look stronger than ideas.
4. A tap on a pin opens a card from the bottom of the screen. The card shows:
   - the name, category and area;
   - the saved TikToks, Reels and links for that place, playable in the card;
   - who saved it, who is Interested, and the comments;
   - for a venue: its coming shows, with who's playing, tickets and table prices;
   - for a plan: the day, start time, meeting point and who is going;
   - the Interested button.
5. Several ideas about the same place share one pin. The card lists them all.
   - Every venue on the lineup board has a pin from the start, with no work from a friend. Example: the Savaya pin in Uluwatu opens a card with its coming shows, who's playing, tickets, table prices, and every Reel the group saved about Savaya.
   - Every must-do event has a pin with its date on it. Example: the Full Moon Party pin at Haad Rin, Koh Phangan shows "22 Feb", who is going, the ticket details and the saved videos.
   - **Any friend can add to the map.** The Map tab has an Add button with three ways to add a place:
     - search for the place by name and pick a result;
     - press and hold a spot on the map to drop a pin there, then name it;
     - paste a Google Maps link.
   - The friend then picks a category and can add a note, a TikTok or a Reel. The new place is a normal idea: it shows in the ideas list with the friend's name, and others can tap Interested and comment.
   - A friend can also add a video or a note to a pin that already exists, from its card.
   - If the new place is within about 50 metres of an existing pin with a similar name, the app asks "Same place as Savaya?" and joins them on a yes.
   - A friend can move or delete only the pins they added. The organizer can move, rename or delete any pin.
6. Filters match the ideas list: category, day, and "Plans only".
7. A day filter shows that day's plans in order, joined by a line, so the group sees how far apart they are.
8. An idea with no location has no pin. The ideas list shows it with an "Add location" button. A friend adds the location by pasting a Maps link or by searching for the place name.
9. If the map tiles fail to load, or there is no signal, the tab shows the same places as a list grouped by area.

## 7. Decide

1. The organizer can start a vote between options, for example two villas, or three parties on Friday night. It works like the place vote: friends tap I'm in on each option they want.
2. A vote shows who voted for each option and who has not voted.
3. The organizer closes the vote and confirms the winner.
4. Every item shows its stage:
   - **Idea:** a friend saved it.
   - **Plan:** the organizer confirmed it.
   - **Booked:** the booking owner made the reservation.
5. Each friend RSVPs to each plan separately: Going, Maybe or Not going.
6. The group can split up. Two plans can happen at the same time.

## 8. Itinerary

1. The itinerary lists plans by day, in the destination's local time.
2. Night rule: a plan that starts between 00:00 and 05:59 shows under the night before, with its real date and time. Example: "Friday night · Sat 1:00 am".
3. Each plan shows the venue, meeting point, start time and who is going.
4. On a phone, the itinerary and the map are two tabs. On a wide screen, they sit side by side.

## 9. Club nights and tables

1. A trip can have many club nights. A club night can have many tables.
2. Each table has a name, a size, a guest list, a booking owner and a status: Proposed, Requested, Confirmed or Canceled.
3. For each club night, a friend picks one: Join a table, Going on my own, Maybe or Skipping.
4. A friend who goes on their own still sees the meetup and is on the club night's guest list.
5. A friend can sit at only one table per club night. The app blocks a second table.
6. A full table takes nobody else. Each table shows its open spots.
7. The booking owner can move friends between tables.
8. Each table keeps the reservation name, confirmation code, promoter contact, entry instructions and arrive-by time together.
9. A table shows its quoted price or minimum spend, copied from the show or entered by the booking owner. The app does not split it or track who paid.

## 10. Home screen

1. **Before the trip,** the home screen lists what the friend must do next: vote on the place, answer the date poll, RSVP, or pick a table. Each item has its button on it.
2. **During the trip,** the home screen leads with the friend's next plan: where to meet, when to leave and who is coming.
3. **On a club night,** the home screen shows the reservation name, the friend's table, the promoter contact and the entry cutoff.
4. **What changed:** when a friend opens the trip, the app lists the changes since their last visit, such as a new meeting time or a table move.

## 11. Borrowed from other apps

| What we borrow | From | Why it fits this group |
| --- | --- | --- |
| Date poll that becomes RSVPs | [Partiful](https://help.partiful.com/hc/en-us/articles/24495283288987) (Find a Time) | It is the organizer-confirms flow for dates. |
| Votes on places, dates and stays | [Troupe](https://apps.apple.com/us/app/troupe/id1610022190) | Settles "Bali or Tulum" and "which club on Saturday". |
| One-tap reactions | [Google Maps lists](https://blog.google/products/maps/google-maps-updates-november-2023/) | I'm in and Interested without typing. |
| Save now, sort later | [Plotline](https://apps.apple.com/au/app/id6759443026), [Wanderlog](https://wanderlog.com) | Friends paste fast from the group chat. Nothing is lost when a preview fails. |
| One link, no download | [Partiful](https://help.partiful.com/hc/en-us/articles/26526377667739-Why-use-Partiful) | The link in the group chat is the whole sign-up. |
| Who is going, on every plan | [DICE](https://apps.apple.com/us/app/dice-live-shows/id898358948), [Discotech](https://discotech.me/) | Nights out are decided by who is in. |
| Itinerary beside the map | [Wanderlog](https://wanderlog.com) | On a phone, "where next" needs both. |
| Night rule | [ArtWin Live](https://artwinlive.com/help/article/using-the-in-the-night-setting-in-artwin-live) | The 1 a.m. afterparty belongs to Friday night. |
| Plan card with directions | [Howbout](https://howbout.app/groups), [Tripsy](https://apps.apple.com/us/app/tripsy-travel-planner/id1429967544) | Meeting point, start time and the way there, in one card. |
| Table cards with size and guest list | [Discotech](https://discotech.me/) | Club nights need to show who sits where. |

Pitfalls from app reviews, and how v1 avoids them:

- **Wrong places from AI guesses** (Wanderlog, Layla): v1 makes no guesses. Later AI suggestions show as drafts for a person to confirm.
- **Photo location leaks** (Partiful, Oct 2025): v1 stores no photos. Later uploads lose their location data before they are stored.
- **Pushy RSVPs** (Partiful): the app shows the plan before it asks.
- **Paywalls**: none. The app is for one group.

## 12. Privacy and safety

1. Trips are private. Only members can read a trip.
2. The invite link holds a long random key. Search engines do not index trip pages.
3. Friends join without an account (Firebase anonymous sign-in). The organizer signs in with Google, so the organizer never loses the trip.
4. Database rules let a friend change only their own RSVP, ideas, votes and comments. Only the organizer and booking owners change plans and tables.
5. If a friend loses their session, the organizer can join the new session to the friend's old name.
6. v1 stores no photos.

## 13. Failures and edge cases

| Case | What the app does |
| --- | --- |
| The link reader is down or slow | The save still works. The idea shows "No preview". The reader retries twice. |
| A TikTok or Instagram post is removed or private | The embed shows the platform's error. The link and note stay. |
| Two friends save the same link at the same moment | A database transaction keeps one idea. The second note becomes a comment. |
| Two friends use the same name | The app asks the second friend to add an initial. |
| Two places or two date ranges tie | The organizer decides. The vote shows the tie. |
| Few friends have voted when the vote closes | The organizer can still confirm. The vote shows how many voted. |
| A friend tries to vote after the vote closes | The vote is read-only. The friend sees the result. |
| A table fills while a friend is joining | The join fails with "Table full". The app shows the other tables. |
| A plan's time or place changes after the organizer confirms it | "What changed" shows the old and the new value. |
| No signal | The app shows the last copy, labeled "Offline, updated 9:42 pm". Changes send when the signal returns, while the app stays open. |
| A friend is in another time zone | Times always show in destination time, with a label. |
| The invite link leaks | The organizer resets the link. Removed members lose access. |

## 14. Acceptance tests

### 14.1 Settle the trip

1. The organizer opens a place vote with Bali, Tulum and Ibiza, and a date poll with three ranges.
2. A friend saves two Uluwatu Reels to the Bali option.
3. Friends vote. The organizer copies a reminder that names the two friends who have not voted.
4. The organizer confirms Bali and 12–19 March.
5. Each friend's answer for 12–19 March becomes their RSVP. The trip shows "Bali · 12–19 Mar" at the top.
6. A friend saves a lineup link for a DJ at a Uluwatu club. Five friends tap I'm in, and the organizer confirms the show.
7. Friends save three villas. The organizer puts them to a vote and confirms the winner.
8. The Uluwatu list shows every idea saved to Uluwatu, with the most Interested first.

### 14.2 Friday club night

1. A friend saves a Reel for a Friday party, with the note "Friday party".
2. The group sees the idea and taps Interested.
3. The organizer turns it into a club night and creates two tables: one for 6 and one for 10.
4. Friends join a table. One friend picks Going on my own.
5. The booking owner marks a table Confirmed and adds the reservation name and entry cutoff.
6. On Friday night, each friend opens the trip and sees the meeting point, the entry cutoff and their table. This works without signal too.

## 15. Not in v1

- AI that reads captions, transcripts or screenshots to suggest the venue.
- An iPhone Shortcut that adds the app to the share menu.
- Push notifications. iPhone sends them only to web apps on the home screen.
- Photo uploads.
- Money. The owner left costs out of scope.
