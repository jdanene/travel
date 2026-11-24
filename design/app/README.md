# App design: handoff

The design is law. Where a ticket or a later document disagrees with the mock, the mock wins. The exceptions are in this file only.

## What to read, in this order

1. `docs/requirements.md`, section 0 only. Sections 1 to 15 are the backlog. Do not build them.
2. `public/designs/20/index.html`: design 20, "The page moves forward". Live copy: https://travel-ca8f9.web.app/designs/20/
3. `docs/trip-app/plan.md`: the domain model, the data contract, the edge cases and the ticket order.

The mock holds ten phone screens. All ten sit on line 183 of the file, so tickets name a screen by its number.

| Screen | Caption in the mock | What it fixes |
|---|---|---|
| 1 | (a) Invitation: dates open | The trip before a reply, the three reply buttons, who replied |
| 2 | (a) Dates lead | Date options, Yes / Maybe / No, counts, the two "next" rows |
| 3 | (a) Organizer: confirm the dates | The organizer notice, who said yes, the confirm button |
| 4 | (b) Dates pinned; Stay leads | The pinned line, the stay cards, hearts, Add a place |
| 5 | (b) Add a place by link | The Add a place sheet |
| 6 | (b) Organizer: confirm the stay | Confirm this stay |
| 7 | (c) Stay pinned; Parties lead | Who's playing: place, venue, date, artist, the last-year line, I'm in |
| 8 | (c) Add a party | The Add a party sheet |
| 9 | (d) All set: the summary | The summary cards |
| 10 | Map, opened from the summary | The map, the pins, the open card |

Content, order, words and icons come from the mock. Use its words exactly: grep the mock for a string before you type it.

## Exceptions to the mock

1. **Stays and photos are examples.** The stays in the mock are made up, and their photos are scenery. The app shows what friends add.
2. **The crew is an example.** The initials JD, TO, KA, MB, DE, SN, RJ, LC and RB are sample friends.
3. **One pinned stay line for each destination.** Screens 7 and 9 show one line, for Bali. The app shows a line for each destination that has a confirmed stay.
4. **A value the link reader cannot read becomes an input.** On screen 5 the name, the area and "sleeps" come from the link. When the reader fails or a value is missing, the same position holds an input for that value.
5. **No Directions button.** The owner removed it on 23 Nov 2026. Do not add it back.
6. **The game-cover style stays on the hype pages.** The app uses the mock's clean look only.

7. **Words for states the mock does not draw.** The mock shows the happy path. These strings are new and are fixed here: the join sheet "Who are you?", "Your name", "Already replied"; the empty states "No dates to vote on yet.", "No places yet.", "Nothing announced yet.", "No pins yet."; the organizer's undo "Change the dates", "Change the stay"; the failures "This link does not open a trip. Ask the organizer for the link.", "No connection", "This organizer link is not valid.", "Try again"; the edit actions "Edit", "Remove"; the splash button "OPEN THE TRIP".
8. **A Map row at the foot of the page.** The mock opens the map from the summary only. Before "All set" there is no summary, so the page ends with one row, "Map", that opens it.
9. **Stay waits for the dates.** Screen 2 shows a Stay "next" row before the dates are confirmed. The app shows no Stay row until the dates are confirmed. (Owner, 23 Nov 2026.)
10. **Dates, Stay and Parties are equals.** The mock shows one block leading and the others pinned or "next". The app shows open sections of equal weight. The only rule of order: Stay does not show until the dates are confirmed. A settled section shrinks to its pinned line. (Owner, 23 Nov 2026.)

Record a new exception here, in the same commit as the code that makes it.
