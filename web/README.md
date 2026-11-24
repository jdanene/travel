# web: the trip app

A Vite, React and TypeScript single page. It builds into `public/app/`, and Firebase Hosting serves it at `/trip/<tripId>` through a rewrite in `firebase.json`.

- `npm run dev`: run the app on your machine.
- `npm run build`: build into `../public/app` (that folder only; the hype pages are untouched).
- `npm test`: run the header examples with Vitest.

Read `docs/trip-app/plan.md`, section 3, before adding a file. `src/README.md` files say what belongs where.

Settings, read at build time from `.env.production.local` (git-ignored; never commit it):

- `VITE_KLIPY_KEY`: the KLIPY key for the Feed's GIFs and stickers (partner.klipy.com, API Keys). Without it the emoji panel shows only Emoji.
- `VITE_EMULATOR_DB_PORT`, `VITE_EMULATOR_AUTH_PORT`: only for a second local run while another checkout's emulators hold 9000 and 9099. `RULES_DB_PORT` does the same for the rules tests.
