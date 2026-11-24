/**
 * Creates the trip from local/trip.json, or updates it, and prints two
 * links: one for the crew, one for the organizer.
 *
 * Usage, from the repo root: node scripts/create-trip.mjs [--emulator]
 *   --emulator  writes to the database emulator (127.0.0.1:9000) and prints
 *               links to the hosting emulator.
 *
 * The first run makes the trip id (20 random characters) and the organizer
 * key, and saves both in local/trip.state.json (local/trip.state.emulator.json
 * with --emulator). Every later run keeps them.
 * Each run replaces info, crew/expected, dates/options, places and the
 * admin list (tripSecrets/{tripId}/admins, from the file's `admins`), and
 * touches nothing else: answers, hearts, stays and shows stay. Removing an
 * email from `admins` stops it making new organizers; a device that is
 * already an organizer stays one until its crew/organizers/{uid} entry is
 * deleted by hand (plan, D15). Everything
 * goes in one update, so nothing is half written. No step retries.
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { emailKey, idFromName } from "../web/src/lib/ids.ts";
import { validateTripFile } from "./trip-file.mjs";

const PROJECT = "travel-ca8f9";
const TRIP_FILE = "local/trip.json";
const PLACES_FILE = "data/places.json";

const emulator = process.argv.includes("--emulator");
// The emulator keeps its own id and key, so the live trip never reuses ones a test run printed.
const STATE_FILE = emulator ? "local/trip.state.emulator.json" : "local/trip.state.json";

function stop(message) {
  console.error(`create-trip: ${message}`);
  process.exit(1);
}

function readJson(path) {
  if (!existsSync(path)) stop(`${path} is missing.${path === TRIP_FILE ? " Copy data/trip.example.json there and fill it in." : ""}`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    stop(`${path} is not JSON: ${error.message}`);
  }
}

/** Letters and digits only, so the id and the key fit any path and the rules' key pattern. */
function randomId(length) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return [...randomBytes(length)].map((byte) => letters[byte % letters.length]).join("");
}

const file = readJson(TRIP_FILE);
const problems = validateTripFile(file, idFromName);
if (problems.length) stop(`${TRIP_FILE} is not right:\n  - ${problems.join("\n  - ")}`);

const places = readJson(PLACES_FILE);
mkdirSync("local", { recursive: true });
const state = existsSync(STATE_FILE) ? readJson(STATE_FILE) : { tripId: randomId(20), organizerKey: randomId(24) };
writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
const { tripId, organizerKey } = state;

const destinations = Object.fromEntries(
  Object.entries(file.destinations).map(([id, { name }]) => [id, { name, ...places.destinations[id] }]),
);
const info = {
  name: file.name,
  summary: file.summary ?? null,
  note: file.note ?? null,
  noteBy: file.noteBy ?? null,
  season: file.season,
  anchor: file.anchor,
  destinations,
};
const update = {
  [`trips/${tripId}/info`]: info,
  [`trips/${tripId}/crew/expected`]: Object.fromEntries(file.crew.map((name) => [idFromName(name), name])),
  [`trips/${tripId}/dates/options`]: Object.fromEntries(
    file.dateOptions.map(({ from, to }) => [`${from}_${to}`, { from, to }]),
  ),
  [`trips/${tripId}/places`]: { areas: places.areas, venues: places.venues },
  [`tripSecrets/${tripId}/organizerKey`]: { [organizerKey]: true },
  // The whole node, so an email taken out of the file is taken out here; null when there are none.
  [`tripSecrets/${tripId}/admins`]: (file.admins ?? []).length
    ? Object.fromEntries(file.admins.map((email) => [emailKey(email.trim()), true]))
    : null,
};

const updateFile = "local/trip.update.json";
writeFileSync(updateFile, JSON.stringify(update));
try {
  execFileSync("firebase", ["database:update", "/", updateFile, "--project", PROJECT, "--force"], {
    stdio: ["ignore", "ignore", "pipe"],
    env: emulator ? { ...process.env, FIREBASE_DATABASE_EMULATOR_HOST: "127.0.0.1:9000" } : process.env,
  });
} catch (error) {
  const said = String(error.stderr ?? error.message).trim();
  stop(`the write failed; nothing was changed.\n${said}\nIf the Firebase CLI is not signed in, run: firebase login`);
}

const site = emulator ? "http://127.0.0.1:5055" : `https://${PROJECT}.web.app`;
const links = `crew link: ${site}/?t=${tripId}\norganizer link: ${site}/trip/${tripId}?organizer=${organizerKey}\n`;
writeFileSync(emulator ? "local/links.emulator.txt" : "local/links.txt", links);
process.stdout.write(links);
