# parties: who is playing, and who is in

Owns `parties/shows`, `parties/lastYear`, `parties/in`, and the event tags (`parties/showTags`, `places/tagNames`). Draws the Events module (screen 20/7; "Parties" in the mocks and in code), the show sheet (opening with the event's card, design exception 38) with its Tags part, the club sheet, and the Add an event sheet (20/8).

- `lib/`: the pure rules. `shows.ts` says when two shows are one (`showId`, also used by `scripts/seed-parties.mjs`) and how the list is ordered; `lastYear.ts` says where the last-year line appears and what "Last season:" lists; `detail.ts` says when and where a show is (`showPlace` for the sheet and the shared event page), which map place it opens, and whether its link opens; `tags.ts` reads the event tags and says what the list shows under each tag and under "All" (also used by the Events button's count and the map's venue pins); `countries.ts` says which country chips the list has and what it shows under each. `club.ts` says what a club's sheet shows (`clubOf`), which of its links may open (`httpsLink`) and its Google Maps search link (`mapsLink`).
- `api/`: the reads and writes, all through `lib/db.ts`.
- `components/`: the module, its rows, the filter chips, the show sheet and its Tags part (`EventTags.tsx`), the Add an event sheet, "Share" (`ShareButton.tsx`), and the shared page of one event (`EventPage.tsx`), a club's sheet (`ClubSheet.tsx`, design exception 37) the event's wide card with the artist over its picture (`EventCard.tsx`), and the wide picture both draw (`PhotoCard.tsx`). With no member the module is the read-only list of the shared events page.

May import `components/`, `lib/` and `types/`. Only `app/` imports it.
