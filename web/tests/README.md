# tests: the database rules tests

`rules.test.ts` proves the rules in `database.rules.json` against the database emulator, using the paths in `src/lib/paths.ts`. Run it with `npm run test:rules` from `web/`.

- Belongs here: tests that need the emulator.
- Does not belong here: header examples of pure functions. They sit next to their function in `src/`.
