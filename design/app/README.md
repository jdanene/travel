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
| 12/5 | Parties, opened in place | The same frame for Parties, and "See on the map ›" |
| 12/6 | Map | The map, the Bali / Koh Phangan switch, the pin card |

### Design 20: what is inside a module

Where 12 and 20 differ inside a module, 20 wins, fitted into 12's module frame.

| Screen | Caption in the mock | What it fixes inside a module |
|---|---|---|
| 20/2 | (a) Dates lead | Date options, Yes / Maybe / No, counts, "Most yes", who has not answered; "Add dates" is exception 11 |
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
7. **Words for states the mocks do not draw.** The mocks show the happy path. These strings are new and are fixed here: the join sheet "Who are you?", "Your name", "Already replied", and its refusals "Type your name." and "Use 24 characters or fewer."; a refused write "This was not saved."; the Add a place inputs when the reader finds nothing (Booking.com always) "Add the name and area.", "Name", "Area", "Sleeps"; the empty states "No dates to vote on yet.", "No places yet.", "Nothing announced yet.", "No pins yet.", "No links yet."; the organizer's undo "Change the dates", "Change the stay"; the failures "This link does not open a trip. Ask the organizer for the link.", "No connection", "This organizer link is not valid.", "Try again"; the edit actions "Edit", "Remove"; the splash button "OPEN THE TRIP"; the Links module "Links", its line under the heading "Cool TikToks and Instas about Bali and Thailand.", "Add a link", "Paste an Instagram or TikTok link.", "What is it?", "Save"; the module state lines "Answered" (the member answered every date option), and for Links "TikToks & Instas" when empty, else "1 link" / "N links" (owner, 23 Nov 2026). The Add a party refusals: "Pick a day from 1 Feb to 31 Mar.", "Add the venue.", "Add who is playing.", "Paste a link that starts with https://", "Only the friend who added it, or the organizer, can change it."; and the Parties link "See on the map ›". The organizer's Google sign-in (plan, D15): the quiet link at the foot of the page "Organizer sign-in", and its failures "This account is not an organizer of this trip.", "The Google window was closed or blocked.", "Google sign-in is not turned on for this app." and "Sign-in did not work." Add dates (exception 11): the button and sheet title "Add dates", the fields "From" and "To", the button "Add", and the refusals "Pick a day from 1 Feb to 31 Mar." and "Pick a day on or after From." Add to map (exception 14, owner, 24 Nov 2026): "Add to map", "Search for a place", the suggestion line "Single Fin · Pecatu", "Search by Photon · © OpenStreetMap", "No match. Tap the map instead.", "Can't find it? Tap the map instead", "Tap the map where it is.", "Drag the pin to move it.", "Tap a spot in Bali." / "Tap a spot in Koh Phangan.", "Name", "What is it?", "Event", "Food", "Beach", "Activity", "Other", "Link (optional)", "Add", "Cancel", and on a friend's place card "Food · added by KA", "Open link", "Remove".
8. **The organizer votes too, and may confirm any option.** Screen 20/3 shows the organizer without Yes / Maybe / No and with "Confirm these dates" on the most-yes option only. The organizer is a friend too, so the buttons stay; every option has "Confirm these dates", the most-yes one as the main button and the others in the second style, because an option nobody said yes to may be confirmed (plan, case 12). "Organizer view." sits inside the modules where the organizer acts, as on 20/3, not above the home page.
9. **Phone and desktop.** The mocks draw a phone only. On a phone the app is the mocks' one column, and once a friend has joined, the cover photo is shorter (at most 240 px) so the first module buttons show without scrolling; the invitation keeps its tall photo. Opening a module scrolls it to the top of the window. From 900 px up the page is centred, at most 1200 px wide, in two columns: on the left, sticky, the flyer (photo, organizer's avatar, trip name, date line, "6 of 8 replied", "All set"); on the right, the module buttons and the open module. The invitation puts the photo on the left and the trip, the note and the replies on the right. A sheet becomes a centred dialog. The Map is taller. Type and spacing scale with the window, from 16 px at 900 px to 19 px at about 1900 px. At most two columns; the owner's limit is three. (Owner, 23 Nov 2026.)
10. **Stay cards are Airbnb cards.** Screen 20/4 draws a stay as a row with a small photo. The app draws it as a card: a large photo with rounded corners, the heart and its count over the photo's top right corner, then the name, one line of facts, "Open listing" with who hearted it, and, for the organizer, "Confirm this stay" across the card. One card per row on a phone; two per row in the desktop column. Words and order are 20/4's. (Owner, 23 Nov 2026.)
11. **Friends add their own dates.** Screen 20/2 lists the organizer's options only. Under the options sits "Add dates" (the Links module's second-style button); it opens the shared sheet with "From" and "To" and "Add". The new option shows for everyone at once, sorted by its first day, with "· added by KA" ("added by you" for your own) on its count line, in 20/4's words, and the adder's Yes. An option need not include 22 Feb, and no option marks it: 20/2's line "Each includes the Full Moon Party, Mon 22 Feb." is gone, and options are plain ranges with their counts (owner: "Stop highlighting the Full Moon Party."). The adder, or an organizer, sees "Remove" on an option while nobody else has voted on it. (Owner, 24 Nov 2026: "there should be an option to create your own date interval, and that interval then shows for everyone else.")

12. **The date line names the whole season.** The mocks write "February 2027". The trip is in February and March, so the flyer reads "February – March 2027 · Full Moon Party 22 Feb". (Owner, 24 Nov 2026.)

13. **The map looks like a modern travel map.** The mock loads Leaflet with OpenStreetMap's own tiles. The app draws OpenFreeMap's Positron vector map with MapLibre, in the app's colours: warm land, soft teal water, muted roads, one English name per label. Pins are white pills with the kind's icon on the accent's soft tint and the name; the open pin fills with the accent; a count pin ("3 pins") shows its icon on the accent. The camera flies to a destination and to an opened pin, and jumps when the device asks for reduced motion. Attribution stays visible and small. Words, pills, grouping, the card and the list fallback are unchanged. (Owner, 23 Nov 2026: "The map could look sleeker".)

14. **Add to map.** The mocks have no way for a friend to put a place on the map. Under the map, "Add to map" opens a search ("Search for a place", suggestions from Photon as the friend types, kept inside the destination); a pick drops a crosshair pin and fills the name; the pin drags; "Can't find it? Tap the map instead" falls back to a tap. Under the map: Name, "What is it?" (Event, Food, Beach, Activity, Other), "Link (optional)", "Add", and "Cancel". The pin shows for everyone at once with its kind's icon; its card says "added by KA", holds the link, and shows "Remove" to the friend who added it and to an organizer. A friend's place cannot be edited. (Owner, 24 Nov 2026: "I'm confused how to add something to the map.")

Record a new exception here, in the same commit as the code that makes it.
