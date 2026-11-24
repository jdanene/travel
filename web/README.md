# web: the trip app

A Vite, React and TypeScript single page. It builds into `public/app/`, and Firebase Hosting serves it at `/trip/<tripId>` through a rewrite in `firebase.json`.

- `npm run dev`: run the app on your machine.
- `npm run build`: build into `../public/app` (that folder only; the hype pages are untouched).
- `npm test`: run the header examples with Vitest.

Read `docs/trip-app/plan.md`, section 3, before adding a file. `src/README.md` files say what belongs where.
