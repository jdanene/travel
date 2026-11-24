# parties: who is playing, and who is in

Owns `parties/shows`, `parties/lastYear` and `parties/in`. Draws the Events module (screen 20/7; "Parties" in the mocks and in code), the show sheet, and the Add an event sheet (20/8).

- `lib/`: the pure rules. `shows.ts` says when two shows are one (`showId`, also used by `scripts/seed-parties.mjs`) and how the list is ordered; `lastYear.ts` says where the last-year line appears and what "Last season:" lists; `detail.ts` says when and where a show is, which map place it opens, and whether its link opens.
- `api/`: the reads and writes, all through `lib/db.ts`.
- `components/`: the module, its rows, the show sheet and the Add an event sheet.

May import `components/`, `lib/` and `types/`. Only `app/` imports it.
