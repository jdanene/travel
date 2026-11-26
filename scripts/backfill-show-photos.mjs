/**
 * Gives the trip's events their own picture (owner, 25 Nov 2026: "try to
 * get a pic of the artist or line up") and their start and end times
 * (owner, 25 Nov 2026: "start and end time when applicble"). It runs the
 * events check here, with the link reader's own code
 * (services/link-reader/events.mjs), and for each event the check returns
 * with a picture or a time, it sets photoUrl, or startTime and endTime, on
 * the trip's show with the same id (web/src/features/parties/lib/shows.ts
 * showId), when that show has none. The app shows the picture on the
 * shared event page, and the times under the date on the show sheet and
 * the event page; a show with none keeps its venue's picture and has no
 * time line.
 *
 * Usage, from the repo root: node scripts/backfill-show-photos.mjs [--emulator] [--trip <id>] [--write]
 *   --emulator  reads and writes the database emulator (FIREBASE_DATABASE_EMULATOR_HOST, else 127.0.0.1:9000) and its trip.
 *   --trip      a trip id in place of the one in local/trip.state.json.
 *   --write     writes; without it the run only prints what it would write.
 *
 * Safe to run again: it reads the trip first, touches only
 * parties/shows/<id>/photoUrl, startTime and endTime, never overwrites a
 * value that exists, and skips a show the trip does not hold. The times go
 * as a pair, only on a show with neither (a show a friend or the organizer
 * gave a start keeps it, and gets no end it did not choose). A picture must
 * be https and at most 500 characters; a time must be "HH:MM", and an end
 * needs a start (database.rules.json, through showTimes in
 * web/src/features/parties/lib/detail.ts). Everything goes in one
 * update; a read or a write that fails stops the run with nothing changed.
 * It fetches the clubs' pages, never the pictures.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";

// The page's files import their neighbours without the ".ts" ending, as Vite allows; this teaches Node the same.
register(
  "data:text/javascript," +
    encodeURIComponent(
      'export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (s.startsWith(".") && !s.endsWith(".ts")) return next(s + ".ts", c); throw e; } }',
    ),
);
const { showId } = await import("../web/src/features/parties/lib/shows.ts");
const { showTimes } = await import("../web/src/features/parties/lib/detail.ts");
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
let pictures = 0;
let times = 0;
for (const event of answer.events) {
  const image = typeof event.image === "string" && event.image.startsWith("https://") && event.image.length <= 500 ? event.image : null;
  const time = showTimes(event.startTime, event.endTime);
  const was = given.get(event.venue) ?? { pictures: 0, times: 0, all: 0 };
  given.set(event.venue, { pictures: was.pictures + (image ? 1 : 0), times: was.times + (time.startTime ? 1 : 0), all: was.all + 1 });
  if (!image && !time.startTime) continue;
  const id = showId({ destination: event.destination, venue: event.venue.trim(), date: event.date, artist: event.artist.trim() });
  const show = shows[id];
  if (!show) continue;
  const at = `trips/${tripId}/parties/shows/${id}`;
  if (image && show.photoUrl) lines.push(`  keep   ${id} (has a picture)`);
  else if (image) {
    update[`${at}/photoUrl`] = image;
    pictures += 1;
    lines.push(`  set    ${id} photoUrl ← ${image}`);
  }
  if (time.startTime && (show.startTime !== undefined || show.endTime !== undefined)) lines.push(`  keep   ${id} (has a time)`);
  else if (time.startTime) {
    for (const [key, value] of Object.entries(time)) update[`${at}/${key}`] = value;
    times += 1;
    lines.push(`  set    ${id} ${time.startTime}${time.endTime ? `–${time.endTime}` : ""}`);
  }
}

console.log(`backfill-show-photos: the check found ${answer.events.length} events in the season, ${answer.events.filter((e) => e.image).length} with a picture, ${answer.events.filter((e) => showTimes(e.startTime, e.endTime).startTime).length} with a time.`);
for (const [venue, n] of [...given].sort()) console.log(`  ${venue}: ${n.pictures} of ${n.all} with a picture, ${n.times} with a time`);
for (const { venue, reason } of answer.failed) console.log(`  ${venue}: not read (${reason})`);
console.log(lines.length ? lines.join("\n") : "  no show of the trip matches an event with a picture or a time.");

const total = Object.keys(update).length;
if (total === 0) {
  console.log("backfill-show-photos: nothing to write.");
  process.exit(0);
}
if (!write) {
  console.log(`backfill-show-photos: would write ${pictures} pictures and ${times} times. Run again with --write to write them.`);
  process.exit(0);
}

const updateFile = emulator ? "local/show-photos.update.emulator.json" : "local/show-photos.update.json";
// local/ is git-ignored, so a fresh checkout may not have it yet.
mkdirSync("local", { recursive: true });
writeFileSync(updateFile, JSON.stringify(update));
try {
  execFileSync("firebase", ["database:update", "/", updateFile, "--project", PROJECT, "--force"], {
    stdio: ["ignore", "ignore", "pipe"],
    env: emulator ? { ...process.env, FIREBASE_DATABASE_EMULATOR_HOST: EMULATOR_HOST } : process.env,
  });
} catch (error) {
  stop(`the write failed; nothing was changed.\n${String(error.stderr ?? error.message).trim()}\nIf the Firebase CLI is not signed in, run: firebase login`);
}
console.log(`backfill-show-photos: wrote ${pictures} pictures and ${times} times${emulator ? " in the emulator" : ""}.`);
