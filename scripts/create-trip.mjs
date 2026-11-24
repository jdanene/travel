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
 * Each run replaces info (each field by its own path, so info/inviteTitle,
 * which an organizer sets with "Edit invite", stays; absent, the page and
 * the link preview use the default), crew/expected, places/areas,
 * places/venues (each with its `big` tag from data/places.json, plan D18),
 * its own organizer key (the keys organizers add on the page stay)
 * and the admin list (tripSecrets/{tripId}/admins, from the
 * file's `admins`),
 * writes each starting date option by its own path, seeds the venue tags
 * (places/tags: "big", named "Big nights", on each venue data/places.json
 * marks `big`) only while the trip has neither places/tags nor
 * places/tagNames, so an organizer's tag edits survive every later run,
 * and touches nothing else: the options friends added with "Add dates", answers, hearts, stays,
 * shows and the friends' places (places/custom) stay. A starting option
 * taken out of the trip file stays in the database; the organizer removes
 * it on the page. Removing an email from `admins` stops it making new
 * organizers; a device that is already an organizer stays one until its
 * crew/organizers/{uid} entry is deleted by hand (plan, D15). Everything
 * goes in one update, so nothing is half written. No step retries.
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dateOptionId, emailKey, idFromName } from "../web/src/lib/ids.ts";
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

const databaseEnv = () => (emulator ? { ...process.env, FIREBASE_DATABASE_EMULATOR_HOST: "127.0.0.1:9000" } : process.env);

/**
 * Whether the trip already has places/tags or places/tagNames. The emulator
 * is read over its REST address, because the CLI's database:get there
 * misses the app's namespace (as in stamp-preview.mjs). A read that fails or
 * does not answer in JSON stops the run, so a doubtful run never seeds over
 * the organizer's tags.
 */
async function hasTags() {
  const read = async (path) => {
    let said;
    try {
      if (emulator) {
        const response = await fetch(`http://127.0.0.1:9000${path}.json?shallow=true&ns=${PROJECT}-default-rtdb`, {
          headers: { Authorization: "Bearer owner" },
          signal: AbortSignal.timeout(60_000),
        });
        if (!response.ok) throw new Error(`the emulator answered ${response.status}`);
        said = await response.text();
      } else {
        said = execFileSync("firebase", ["database:get", path, "--shallow", "--project", PROJECT], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60_000 });
      }
      return JSON.parse(said) !== null;
    } catch (error) {
      stop(`could not read ${path}; nothing was changed.\n${String(error.stderr || error.message).trim()}\nIf the Firebase CLI is not signed in, run: firebase login`);
    }
  };
  return (await read(`/trips/${tripId}/places/tags`)) || (await read(`/trips/${tripId}/places/tagNames`));
}

const file = readJson(TRIP_FILE);
const problems = validateTripFile(file, idFromName);
if (problems.length) stop(`${TRIP_FILE} is not right:\n  - ${problems.join("\n  - ")}`);

const places = readJson(PLACES_FILE);
// Each destination needs its centre for the map; a new one is added to data/places.json first.
const noCentre = Object.keys(file.destinations).filter((id) => typeof places.destinations?.[id]?.lat !== "number");
if (noCentre.length) stop(`${PLACES_FILE} has no centre for ${noCentre.join(", ")}; add it under "destinations".`);
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
  // One path per field, so info/inviteTitle, the organizer's, stays; a field set to null is removed.
  ...Object.fromEntries(Object.entries(info).map(([key, value]) => [`trips/${tripId}/info/${key}`, value])),
  [`trips/${tripId}/crew/expected`]: Object.fromEntries(file.crew.map((name) => [idFromName(name), name])),
  // One path per option, so the options friends added stay.
  ...Object.fromEntries(file.dateOptions.map(({ from, to }) => [`trips/${tripId}/dates/options/${dateOptionId(from, to)}`, { from, to }])),
  // Areas and venues only: places/custom holds the friends' own places, which a run must keep.
  [`trips/${tripId}/places/areas`]: places.areas,
  [`trips/${tripId}/places/venues`]: places.venues,
  // One path for this key, so the keys organizers made with "Add an organizer" stay.
  [`tripSecrets/${tripId}/organizerKey/${organizerKey}`]: true,
  // The whole node, so an email taken out of the file is taken out here; null when there are none.
  [`tripSecrets/${tripId}/admins`]: (file.admins ?? []).length
    ? Object.fromEntries(file.admins.map((email) => [emailKey(email.trim()), true]))
    : null,
};

// The venue tags are the organizer's once they exist (owner, 24 Nov 2026); a read that fails stops the run, so
// a doubtful run never writes over them.
if (!(await hasTags())) {
  const big = Object.entries(places.venues).filter(([, venue]) => venue.big === true);
  update[`trips/${tripId}/places/tags`] = Object.fromEntries(big.map(([venueId]) => [venueId, { big: true }]));
  update[`trips/${tripId}/places/tagNames`] = { big: "Big nights" };
}

const updateFile = "local/trip.update.json";
writeFileSync(updateFile, JSON.stringify(update));
try {
  execFileSync("firebase", ["database:update", "/", updateFile, "--project", PROJECT, "--force"], {
    stdio: ["ignore", "ignore", "pipe"],
    env: databaseEnv(),
  });
} catch (error) {
  const said = String(error.stderr ?? error.message).trim();
  stop(`the write failed; nothing was changed.\n${said}\nIf the Firebase CLI is not signed in, run: firebase login`);
}

const site = emulator ? "http://127.0.0.1:5055" : `https://${PROJECT}.web.app`;
// Both links open the splash; its button carries the organizer key into the app.
const links = `crew link: ${site}/?t=${tripId}\norganizer link: ${site}/?t=${tripId}&organizer=${organizerKey}\n`;
writeFileSync(emulator ? "local/links.emulator.txt" : "local/links.txt", links);
process.stdout.write(links);
