# Agents: how to work in this repo

This repo holds the Travel trip app and its hype pages. Read this file before any change.

## Read first, in this order

1. `design/app/README.md`: the handoff. The design is law. Its exceptions live there and only there.
2. `docs/requirements.md`, section 0 only. Sections 1 to 15 are the backlog. Do not build them.
3. `public/designs/20/index.html`: the mock. All ten screens sit on line 183.
4. `docs/trip-app/plan.md`: decisions, domain model, data contract, edge cases, and the tickets in section 9.

## Rules

- **The design is law.** Where a ticket disagrees with the mock, the mock wins. Use the mock's words exactly; grep the mock for a string before you type it. Record a new exception in `design/app/README.md`, in the same commit as the code that makes it.
- **No extras.** Build section 0 of the requirements and nothing else. There is no Directions button anywhere.
- **The repo is public.** Never commit a trip id, an organizer key, or a friend's name, email or phone. The trip file and the links live in `local/`, which git ignores.

## Where code goes (plan section 3)

- `web/`: the app (Vite, React, TypeScript). It builds into `public/app/`, which git ignores.
- `web/src/features/<context>/`: one folder per context (`crew`, `dates`, `stay`, `parties`, `map`). A feature never imports another feature.
- `web/src/app/`: the shell. It joins the contexts: the route, the stage rule, the pinned lines, the "next" rows, the summary.
- `web/src/lib/`, `web/src/components/`, `web/src/types/`: shared by every feature.
- Code flows one way: shared, then features, then app. No barrel files. Every folder has a `README.md` that says what belongs there and who may import it.
- `scripts/`: the deploy (`ship.sh`) and the data scripts. `services/link-reader/`: the Lambda.

Every function carries the four-part header: description, inputs, output, examples. Every example is a test.

## Tests (plan section 6)

Write only the tests a ticket names. Test lines stay at or under code lines. Do not loop on screenshots: check each screen once at 390 px wide against the mock, and write what you saw in the pull request as text. Put no images in the pull request.

- Rule functions: the header examples, run with Vitest (`cd web && npm test`).
- Database rules: `tests/rules.test.ts` against the Firebase emulator.
