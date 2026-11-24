/**
 * Writes the party lineups into the trip: data/lineups/2027-feb-mar.json
 * into parties/shows and data/lineups/2026-feb-mar.json into
 * parties/lastYear, for the trip in local/trip.state.json
 * (local/trip.state.emulator.json with --emulator).
 *
 * Usage, from the repo root: node scripts/seed-parties.mjs [--emulator]
 *   --emulator  writes to the database emulator (127.0.0.1:9000).
 *
 * Each show is written at its own path under an id made from what it is
 * (showId in web/src/features/parties/lib/shows.ts), so a second run
 * rewrites the same records and adds none (case 23). The seed never
 * deletes: a show that left the file stays (case 24), and friends' shows
 * and "in" marks are never touched. A seeded show the organizer edited or
 * removed comes back as the file has it on the next run.
 *
 * Field map: place becomes destination (matched by name against the
 * destinations of local/trip.json); source becomes link when it is an
 * address; artist, about, venue, area, date, weekly and verified keep their
 * names. about is the one plain line under the event's name.
 * weekly ("sun", "sat", ...) marks a show that repeats every week, and date
 * is then its first night, which must fall on that day. note holds research
 * notes and is not written.
 *
 * Both files are checked before anything is written. A missing file, a file
 * that is not JSON, or a show with a missing or wrong field stops the script
 * with the file and the entry named. Everything goes in one update, so
 * nothing is half written. No step retries.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";

// shows.ts imports its neighbours without the ".ts" ending, as Vite allows.
// This hook teaches Node the same, so the seed and the page share one showId.
register(
  "data:text/javascript," +
    encodeURIComponent(
      'export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (s.startsWith(".") && !s.endsWith(".ts")) return next(s + ".ts", c); throw e; } }',
    ),
);
const { showId } = await import("../web/src/features/parties/lib/shows.ts");
const { EVENTS_WINDOW, inEventsWindow } = await import("../web/src/features/parties/lib/window.ts");

const PROJECT = "travel-ca8f9";
const TRIP_FILE = "local/trip.json";
const THIS_YEAR = "data/lineups/2027-feb-mar.json";
const LAST_YEAR = "data/lineups/2026-feb-mar.json";

const emulator = process.argv.includes("--emulator");
// The emulator keeps its own id and key, so the live trip never reuses ones a test run printed.
const STATE_FILE = emulator ? "local/trip.state.emulator.json" : "local/trip.state.json";

function stop(message) {
  console.error(`seed-parties: ${message}`);
  process.exit(1);
}

function readJson(path) {
  if (!existsSync(path)) stop(`${path} is missing.${path === STATE_FILE ? " Run scripts/create-trip.mjs first." : ""}`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    stop(`${path} is not JSON: ${error.message}`);
  }
}

const isDay = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const isText = (value, max) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
const nameKey = (name) => String(name).trim().toLowerCase().replace(/\s+/g, " ");
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const weekdayOf = (day) => WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];

const { tripId } = readJson(STATE_FILE);
const trip = readJson(TRIP_FILE);
const destinationOf = new Map(Object.entries(trip.destinations ?? {}).map(([id, { name }]) => [nameKey(name), id]));

/**
 * Reads one lineup file into records keyed by showId, or stops naming the
 * file and the entry. `inSeason` limits this year's dates to the events
 * window (25 Jan to 31 Mar 2027), as the rules do for a friend's show.
 * Last year's dates are not limited: January feeds "Last season:".
 */
function readLineup(path, { inSeason }) {
  const file = readJson(path);
  if (!Array.isArray(file.shows)) stop(`${path} has no "shows" list.`);
  const records = {};
  file.shows.forEach((entry, i) => {
    const where = `${path}, shows[${i}]`;
    if (!isDay(entry?.date)) stop(`${where} has no date as YYYY-MM-DD.`);
    if (inSeason && !inEventsWindow(entry.date)) stop(`${where}: ${entry.date} lies outside ${EVENTS_WINDOW.from} to ${EVENTS_WINDOW.to}.`);
    if (!isText(entry.venue, 60)) stop(`${where} needs a venue of 1 to 60 characters.`);
    if (!isText(entry.artist, 200)) stop(`${where} needs an artist of 1 to 200 characters.`);
    if (entry.weekly !== undefined && (!WEEKDAYS.includes(entry.weekly) || weekdayOf(entry.date) !== entry.weekly)) {
      stop(`${where}: weekly "${entry.weekly}" must be a day name (${WEEKDAYS.join(", ")}) and fall on its date ${entry.date}.`);
    }
    const destination = destinationOf.get(nameKey(entry.place));
    if (!destination) stop(`${where}: place "${entry.place}" is not a destination in ${TRIP_FILE}.`);
    const show = { destination, venue: entry.venue.trim(), date: entry.date, artist: entry.artist.trim() };
    records[showId(show)] = { ...show, area: isText(entry.area, 60) ? entry.area.trim() : undefined, weekly: entry.weekly, about: isText(entry.about, 200) ? entry.about.trim() : undefined, link: entry.source, verified: entry.verified };
  });
  return { records, at: isDay(file.checked) ? Date.parse(file.checked) : Date.now() };
}

const thisYear = readLineup(THIS_YEAR, { inSeason: true });
const lastYear = readLineup(LAST_YEAR, { inSeason: false });

const update = {};
for (const [id, { area, weekly, about, link, verified, ...show }] of Object.entries(thisYear.records)) {
  update[`trips/${tripId}/parties/shows/${id}`] = {
    ...show,
    ...(area ? { area } : {}),
    ...(weekly ? { weekly } : {}),
    ...(about ? { about } : {}),
    ...(typeof link === "string" && /^https?:\/\//.test(link) && link.length <= 500 ? { link } : {}),
    verified: verified === true,
    source: "seed",
    at: thisYear.at,
  };
}
for (const [id, { destination, venue, date, artist }] of Object.entries(lastYear.records)) {
  update[`trips/${tripId}/parties/lastYear/${id}`] = { destination, venue, date, artist };
}

const updateFile = "local/parties.update.json";
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

const shows = Object.keys(thisYear.records).length;
const before = Object.keys(lastYear.records).length;
console.log(`seed-parties: wrote ${shows} shows and ${before} last-year shows${emulator ? " to the emulator" : ""}.`);
