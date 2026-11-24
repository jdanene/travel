# parties: who is playing, and who is in

Owns `parties/shows`, `parties/lastYear` and `parties/in`. Draws the Parties module (screen 20/7) and the Add a party sheet (20/8).

- `lib/`: the pure rules. `shows.ts` says when two shows are one (`showId`, also used by `scripts/seed-parties.mjs`) and how the list is ordered; `lastYear.ts` says where the last-year line appears.
- `api/`: the reads and writes, all through `lib/db.ts`.
- `components/`: the module and its sheet.

May import `components/`, `lib/` and `types/`. Only `app/` imports it.
