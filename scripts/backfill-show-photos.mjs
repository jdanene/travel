/**
 * Gives the trip's events their own picture (owner, 25 Nov 2026: "try to
 * get a pic of the artist or line up"). It runs the events check here, with
 * the link reader's own code (services/link-reader/events.mjs), and for each
 * event the check returns with a picture, it sets photoUrl on the trip's
 * show with the same id (web/src/features/parties/lib/shows.ts showId),
 * when that show has none. The app shows the picture on the shared event
 * page; a show with none keeps its venue's picture.
 *
 * Usage, from the repo root: node scripts/backfill-show-photos.mjs [--emulator] [--trip <id>] [--write]
 *   --emulator  reads and writes the database emulator (FIREBASE_DATABASE_EMULATOR_HOST, else 127.0.0.1:9000) and its trip.
 *   --trip      a trip id in place of the one in local/trip.state.json.
 *   --write     writes; without it the run only prints what it would write.
 *
 * Safe to run again: it reads the trip first, touches only
 * parties/shows/<id>/photoUrl, never overwrites a photoUrl that exists,
 * and skips a show the trip does not hold. A picture must be https and at
 * most 500 characters (database.rules.json). Everything goes in one
 * update; a read or a write that fails stops the run with nothing changed.
 * It fetches the clubs' pages, never the pictures.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";

// The page's files import their neighbours without the ".ts" ending, as Vite allows; this teaches Node the same.
register(
  "data:text/javascript," +
    encodeURIComponent(
      'export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (s.startsWith(".") && !s.endsWith(".ts")) return next(s + ".ts", c); throw e; } }',
    ),
);
const { showId } = await import("../web/src/features/parties/lib/shows.ts");
const { checkEvents } = await import("../services/link-reader/events.mjs");

const PROJECT = "travel-ca8f9";
const emulator = process.argv.includes("--emulator");
const write = process.argv.includes("--write");
const EMULATOR_HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST || "127.0.0.1:9000";
const STATE_FILE = emulator ? "local/trip.state.emulator.json" : "local/trip.state.json";

function stop(message) {
  console.error(`backfill-show-photos: ${message}`);
  process.exit(1);
}

function tripIdFromArgs() {
  const at = process.argv.indexOf("--trip");
  if (at !== -1) return process.argv[at + 1];
  if (!existsSync(STATE_FILE)) stop(`${STATE_FILE} is missing. Run scripts/create-trip.mjs first, or pass --trip <id>.`);
  return JSON.parse(readFileSync(STATE_FILE, "utf8")).tripId;
}

const tripId = tripIdFromArgs();
if (!/^[A-Za-z0-9_-]{1,64}$/.test(tripId ?? "")) stop("the trip id is not a trip id.");

/** The trip's shows, read once. The emulator is read over REST, as in seed-parties.mjs. */
function readShows() {
  const path = `/trips/${tripId}/parties/shows`;
  try {
    const said = emulator
      ? execFileSync("curl", ["-sf", "--max-time", "60", "-H", "Authorization: Bearer owner", `http://${EMULATOR_HOST}${path}.json?ns=${PROJECT}-default-rtdb`], { encoding: "utf8" })
      : execFileSync("firebase", ["database:get", path, "--project", PROJECT], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120_000, maxBuffer: 64 * 1024 * 1024 });
    return JSON.parse(said) ?? {};
  } catch (error) {
    stop(`could not read the trip; nothing was changed.\n${String(error.stderr || error.message).trim()}\nIf the Firebase CLI is not signed in, run: firebase login`);
  }
}

const shows = readShows();
const answer = await checkEvents();
const update = {};
const given = new Map();
const lines = [];
for (const event of answer.events) {
  const image = typeof event.image === "string" && event.image.startsWith("https://") && event.image.length <= 500 ? event.image : null;
  given.set(event.venue, (given.get(event.venue) ?? 0) + (image ? 1 : 0));
  if (!image) continue;
  const id = showId({ destination: event.destination, venue: event.venue.trim(), date: event.date, artist: event.artist.trim() });
  const show = shows[id];
  if (!show) continue;
  if (show.photoUrl) {
    lines.push(`  keep   ${id} (has a picture)`);
    continue;
  }
  update[`trips/${tripId}/parties/shows/${id}/photoUrl`] = image;
  lines.push(`  set    ${id} ← ${image}`);
}

console.log(`backfill-show-photos: the check found ${answer.events.length} events in the season, ${answer.events.filter((e) => e.image).length} with a picture.`);
for (const [venue, n] of [...given].sort()) console.log(`  ${venue}: ${n} of ${answer.events.filter((e) => e.venue === venue).length} with a picture`);
for (const { venue, reason } of answer.failed) console.log(`  ${venue}: not read (${reason})`);
console.log(lines.length ? lines.join("\n") : "  no show of the trip matches an event with a picture.");

const total = Object.keys(update).length;
if (total === 0) {
  console.log("backfill-show-photos: nothing to write.");
  process.exit(0);
}
if (!write) {
  console.log(`backfill-show-photos: would write ${total} pictures. Run again with --write to write them.`);
  process.exit(0);
}

const updateFile = emulator ? "local/show-photos.update.emulator.json" : "local/show-photos.update.json";
writeFileSync(updateFile, JSON.stringify(update));
try {
  execFileSync("firebase", ["database:update", "/", updateFile, "--project", PROJECT, "--force"], {
    stdio: ["ignore", "ignore", "pipe"],
    env: emulator ? { ...process.env, FIREBASE_DATABASE_EMULATOR_HOST: EMULATOR_HOST } : process.env,
  });
} catch (error) {
  stop(`the write failed; nothing was changed.\n${String(error.stderr ?? error.message).trim()}\nIf the Firebase CLI is not signed in, run: firebase login`);
}
console.log(`backfill-show-photos: wrote ${total} pictures${emulator ? " in the emulator" : ""}.`);
