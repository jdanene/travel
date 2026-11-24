# scripts: deploy and data

- `ship.sh`: the one deploy command. It builds the app, deploys the database rules, then deploys the site. Each step prints its name; the first failure stops the script and names the step. A second run is safe.
- `create-trip.mjs`: creates or updates the trip from `local/trip.json` and prints the crew link and the organizer link. `--emulator` writes to the emulator. The trip id and the organizer key stay in `local/trip.state.json`, and the emulator's in `local/trip.state.emulator.json`, so the live trip never reuses an id or key a test run printed; delete the file for a new trip.
- `trip-file.mjs`: `validateTripFile`, the one check of a trip file.

Run every script from the repo root. `local/` is git-ignored: the trip file, its id, its key and the links never reach the public repo.
