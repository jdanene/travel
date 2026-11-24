# App design: handoff

The design is law. Where a ticket or a later document disagrees with the mocks, the mocks win. The exceptions are in this file only.

## What to read, in this order

1. `docs/requirements.md`, section 0 only. Sections 1 to 15 are the backlog. Do not build them.
2. `public/designs/12/index.html`: design 12, "Flyer". It fixes the home page and the frame of every module. Live copy: https://travel-ca8f9.web.app/designs/12/
3. `public/designs/20/index.html`: design 20, "The page moves forward". It fixes what is inside a module: the date options, the stay cards, the party list, the sheets and the map card. Live copy: https://travel-ca8f9.web.app/designs/20/
4. `docs/trip-app/plan.md`: the domain model, the data contract, the edge cases and the ticket order.

All screens of design 12 sit on line 166 of its file; all screens of design 20 sit on line 183 of its file. Tickets name a screen as "12/3" or "20/5".

### Design 12: the home page and the module frame

| Screen | Caption in the mock | What it fixes |
|---|---|---|
| 12/1 | Invitation: the flyer | The flyer before a reply: photo, organizer's avatar, name, date line, the note, "I'm in / Maybe / Can't", "6 of 8 replied · no app, no account" |
| 12/2 | Home: three buttons | The home page: the cover photo, the organizer's avatar, "Bali · Koh Phangan", the date line, a stack of equal module buttons with their state on the right |
| 12/3 | Dates, opened in place | A module opened in place: the accent ring, the close icon, the content below the title |
| 12/4 | Stay, opened in place | The same frame for Stay |
| 12/5 | Parties, opened in place | The same frame for Events (the mock's Parties, exception 12), and "See on the map ›" |
| 12/6 | Map | The map, the Bali / Koh Phangan switch, the pin card |

### Design 20: what is inside a module

Where 12 and 20 differ inside a module, 20 wins, fitted into 12's module frame.

| Screen | Caption in the mock | What it fixes inside a module |
|---|---|---|
| 20/2 | (a) Dates lead | Date options, Yes / Maybe / No, counts, "Most yes", who has not answered |
| 20/3 | (a) Organizer: confirm the dates | The organizer notice, who said yes, "Confirm these dates" |
| 20/4 | (b) Dates pinned; Stay leads | The stay cards, hearts, "Add a place" |
| 20/5 | (b) Add a place by link | The Add a place sheet |
| 20/6 | (b) Organizer: confirm the stay | "Confirm this stay" |
| 20/7 | (c) Stay pinned; Parties lead | Who's playing: place, venue, date, artist, the last-year line, "I'm in" |
| 20/8 | (c) Add a party | The Add a party sheet |
| 20/10 | Map, opened from the summary | The pins and the open card |

Content, order, words and icons come from the mocks. Use their words exactly: grep the mock for a string before you type it.

## Exceptions to the mocks

1. **Stays and photos are examples.** The stays in the mocks are made up, and their photos are scenery. The app shows what friends add.
2. **The crew is an example.** The initials JD, TO, KA, MB, DE, SN, RJ, LC and RB are sample friends.
3. **Modules are equals.** Dates, Stay, Parties, Links and Map are module buttons of equal weight, in a fixed order that means nothing. One module is open at a time; opening one closes the other; all start closed. Stay exists only after the organizer confirms the dates. A settled module shows its result on its button ("13–23 Feb · confirmed", "Cliffside villa · confirmed"). Links is a module the mocks do not draw, built from the Add a place sheet's pattern. When the dates and every stay are confirmed, a small line under the title reads "All set". (Owner, 23 Nov 2026.)
4. **A value the link reader cannot read becomes an input.** On screen 20/5 the name, the area and "sleeps" come from the link. When the reader fails or a value is missing, the same position holds an input for that value.
5. **No Directions button.** The owner removed it on 23 Nov 2026. Do not add it back.
6. **The game-cover style stays on the hype pages.** The app uses the mocks' clean look only.
7. **Words for states the mocks do not draw.** The mocks show the happy path. These strings are new and are fixed here: the join sheet "Who are you?", "Your name", "Already replied", and its refusals "Type your name." and "Use 24 characters or fewer."; a refused write "This was not saved."; the Add a place inputs when the reader finds nothing (Booking.com always) "Add the name and area.", "Name", "Area", "Sleeps"; the empty states "No dates to vote on yet.", "No places yet.", "Nothing announced yet.", "No pins yet.", "No links yet."; the organizer's undo "Change the dates", "Change the stay"; the failures "This link does not open a trip. Ask the organizer for the link.", "No connection", "This organizer link is not valid.", "Try again"; the edit actions "Edit", "Remove"; the splash button "OPEN THE TRIP"; the Links module "Links", "Add a link", "Paste an Instagram or TikTok link.", "What is it?", "Save"; the module state lines "Answered" (the member answered every date option) and "1 link" / "N links". The Add an event refusals: "Pick a day from 1 Feb to 31 Mar.", "Add the venue.", "Add who is playing.", "Paste a link that starts with https://", "Only the friend who added it, or the organizer, can change it."; the Events link "See on the map ›". The show sheet (exception 11): "See on the map", "Event page", "not confirmed", "Be the first in", "added by KA", the dates "Sat 13 Feb 2027" and "Every Sunday from 7 Feb", and the note when its adder removes it while it is open, "This event was removed."; the weekly tile "Every / Sun" (heard as "Every Sunday"); a venue with nothing this year, "Nothing announced yet. Last season:"; the Add an event venue picker "Choose a venue", "Somewhere else", "Venue name", and its optional "What is it? (optional)"; the Events state line "15 events · I'm in".
8. **The organizer votes too, and may confirm any option.** Screen 20/3 shows the organizer without Yes / Maybe / No and with "Confirm these dates" on the most-yes option only. The organizer is a friend too, so the buttons stay; every option has "Confirm these dates", the most-yes one as the main button and the others in the second style, because an option nobody said yes to may be confirmed (plan, case 12). "Organizer view." sits inside the modules where the organizer acts, as on 20/3, not above the home page.
9. **Phone and desktop.** The mocks draw a phone only. On a phone the app is the mocks' one column, and once a friend has joined, the cover photo is shorter (at most 240 px) so the first module buttons show without scrolling; the invitation keeps its tall photo. Opening a module scrolls it to the top of the window. From 900 px up the page is centred, at most 1200 px wide, in two columns: on the left, sticky, the flyer (photo, organizer's avatar, trip name, date line, "6 of 8 replied", "All set"); on the right, the module buttons and the open module. The invitation puts the photo on the left and the trip, the note and the replies on the right. A sheet becomes a centred dialog. The Map is taller. Type and spacing scale with the window, from 16 px at 900 px to 19 px at about 1900 px. At most two columns; the owner's limit is three. (Owner, 23 Nov 2026.)
10. **Stay cards are Airbnb cards.** Screen 20/4 draws a stay as a row with a small photo. The app draws it as a card: a large photo with rounded corners, the heart and its count over the photo's top right corner, then the name, one line of facts, "Open listing" with who hearted it, and, for the organizer, "Confirm this stay" across the card. One card per row on a phone; two per row in the desktop column. Words and order are 20/4's. (Owner, 23 Nov 2026.)

11. **Show details sheet.** A tap on a show (anywhere but "I'm in", "Edit" and the link button) opens a sheet the mocks do not draw, in the shared Sheet: who is playing in full, its one plain line, the date, "Savaya · Uluwatu, Bali" with the venue's line, who is in with names, "I'm in", then "See on the map" (the Map opens on that venue's destination, centred on it, its card open) and "Event page" (the event's own page, in a new tab). No Directions button and no link out to a maps app (exception 5). Last-year lines open no sheet. (Owner, 24 Nov 2026.)
12. **Parties are called Events.** On screen the module, its button, its sheets and its state line say "Events" and "event"; "Who's playing" and the name "Full Moon Party" stay. Code keeps its words (`parties`, `show`). (Owner, 24 Nov 2026.)
13. **Every venue shows.** Screen 20/7 lists only venues with shows. The app lists every venue the trip knows for each destination: venues with a show this year first, by their first night, then the rest by name, each with its one plain line under the name. A venue with nothing this year says "Nothing announced yet." and, under "Last season:", up to three of last year's acts there, newest first. Each event carries a one-line "about" under its name (one line, cut with "…" on a phone) and, when it has an https page, a small link button before "I'm in". A weekly show (a party every Sunday, say) shows once under its venue with "Every / Sun" in place of the date tile, before the dated shows. (Owner, 24 Nov 2026.)

Record a new exception here, in the same commit as the code that makes it.
