# parties: who is playing, and who is in

Owns `parties/shows`, `parties/lastYear`, `parties/in`, and the venue tags (`places/tags`, `places/tagNames`). Draws the Events module (screen 20/7; "Parties" in the mocks and in code), the show sheet, the Add an event sheet (20/8) and the organizer's Tags sheet.

- `lib/`: the pure rules. `shows.ts` says when two shows are one (`showId`, also used by `scripts/seed-parties.mjs`) and how the list is ordered; `lastYear.ts` says where the last-year line appears and what "Last season:" lists; `detail.ts` says when and where a show is, which map place it opens, and whether its link opens; `tags.ts` reads the venue tags and says what the list shows under each tag and under "All" (also used by the Events button's count and the map's venue pins).
- `api/`: the reads and writes, all through `lib/db.ts`.
- `components/`: the module, its rows, the filter chips, the show sheet, the Add an event sheet and the Tags sheet.

May import `components/`, `lib/` and `types/`. Only `app/` imports it.
