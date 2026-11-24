# web: the trip app

A Vite, React and TypeScript single page. It builds into `public/app/`, and Firebase Hosting serves it at `/trip/<tripId>` through a rewrite in `firebase.json`.

- `npm run dev`: run the app on your machine.
- `npm run build`: build into `../public/app` (that folder only; the hype pages are untouched). Two entries: the app, and `src/prewarm.ts`, which the splash runs to read the trip ahead of the tap. The build also writes `/app/preload.json`, the list of every script, stylesheet and font the splash loads while it plays.
- `npm test`: run the header examples with Vitest.

Read `docs/trip-app/plan.md`, section 3, before adding a file. `src/README.md` files say what belongs where.
