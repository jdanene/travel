/**
 * Seeds the Activity list of a trip that existed before it, so the list is
 * not empty on its first day. It writes lines only from data that already
 * carries a time:
 *   joined           each member (members/{id}.at: the time of their last reply)
 *   stay-added       each stay option (addedBy, at)
 *   event-added      each event a friend added (source "friend", addedBy, at)
 *   link-added       each saved link (addedBy, at)
 *   dates-confirmed  the confirmed dates (by, at)
 * Date votes, hearts, "in" marks, the events check and anything without an
 * author or a time get no line.
 *
 * Usage, from the repo root: node scripts/backfill-activity.mjs [--emulator] [--trip <id>]
 *   --emulator  reads and writes the database emulator (127.0.0.1:9000) and its trip.
 *   --trip      a trip id in place of the one in local/trip.state.json.
 *
 * Idempotent: each line's id is made from what it is about ("bf-" and a
 * hash of its kind and thing), so a second run rewrites the same lines and
 * adds none, and a thing removed since keeps the line it already has. The
 * list sorts by time, so these ids sit among the app's push() ids. Lines
 * the app wrote are never touched. Everything goes in one update; a read
 * or a write that fails stops the run with nothing changed.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";

// The page's files import their neighbours without the ".ts" ending, as Vite allows; this teaches Node the same.
register(
  "data:text/javascript," +
    encodeURIComponent(
      'export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (s.startsWith(".") && !s.endsWith(".ts")) return next(s + ".ts", c); throw e; } }',
    ),
);
const { dayRange } = await import("../web/src/lib/format.ts");
const { siteName } = await import("../web/src/features/links/lib/links.ts");

const PROJECT = "travel-ca8f9";
const emulator = process.argv.includes("--emulator");
const STATE_FILE = emulator ? "local/trip.state.emulator.json" : "local/trip.state.json";

function stop(message) {
  console.error(`backfill-activity: ${message}`);
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

/** The whole trip, read once. The emulator is read over REST, as in seed-parties.mjs. */
function readTrip() {
  try {
    const said = emulator
      ? execFileSync("curl", ["-sf", "--max-time", "60", "-H", "Authorization: Bearer owner", `http://127.0.0.1:9000/trips/${tripId}.json?ns=${PROJECT}-default-rtdb`], { encoding: "utf8" })
      : execFileSync("firebase", ["database:get", `/trips/${tripId}`, "--project", PROJECT], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120_000, maxBuffer: 64 * 1024 * 1024 });
    return JSON.parse(said);
  } catch (error) {
    stop(`could not read the trip; nothing was changed.\n${String(error.stderr || error.message).trim()}\nIf the Firebase CLI is not signed in, run: firebase login`);
  }
}

const trip = readTrip();
if (!trip) stop(`there is no trip ${tripId}.`);

const update = {};
const counts = {};
/** One line at a fixed id, so a second run writes the same path. */
function line(kind, about, entry) {
  if (typeof entry.at !== "number" || (entry.by !== undefined && typeof entry.by !== "string")) return;
  const id = `bf-${createHash("sha1").update(`${kind}/${about}`).digest("hex").slice(0, 20)}`;
  const text = typeof entry.text === "string" ? entry.text.slice(0, 500) : undefined;
  update[`trips/${tripId}/activity/${id}`] = { kind, by: entry.by, at: entry.at, ...(text ? { text } : {}), ...(entry.ref ? { ref: entry.ref } : {}) };
  counts[kind] = (counts[kind] ?? 0) + 1;
}

for (const [id, member] of Object.entries(trip.crew?.members ?? {})) line("joined", id, { by: id, at: member.at });
for (const [id, option] of Object.entries(trip.stay?.options ?? {})) line("stay-added", id, { by: option.addedBy, at: option.at, text: option.name, ref: id });
for (const [id, show] of Object.entries(trip.parties?.shows ?? {})) {
  if (show.source === "friend" && show.addedBy) line("event-added", id, { by: show.addedBy, at: show.at, text: `${show.artist} at ${show.venue}`, ref: id });
}
for (const [id, item] of Object.entries(trip.links?.items ?? {})) {
  line("link-added", id, { by: item.addedBy, at: item.at, text: item.title?.trim() || siteName(item), ref: id });
}
const confirmed = trip.dates?.confirmed;
const option = confirmed && trip.dates?.options?.[confirmed.optionId];
if (option) line("dates-confirmed", confirmed.optionId, { by: confirmed.by, at: confirmed.at, text: dayRange(option.from, option.to), ref: confirmed.optionId });

const total = Object.keys(update).length;
if (total === 0) {
  console.log("backfill-activity: nothing to write.");
  process.exit(0);
}

const updateFile = emulator ? "local/activity.update.emulator.json" : "local/activity.update.json";
writeFileSync(updateFile, JSON.stringify(update));
try {
  execFileSync("firebase", ["database:update", "/", updateFile, "--project", PROJECT, "--force"], {
    stdio: ["ignore", "ignore", "pipe"],
    env: emulator ? { ...process.env, FIREBASE_DATABASE_EMULATOR_HOST: "127.0.0.1:9000" } : process.env,
  });
} catch (error) {
  stop(`the write failed; nothing was changed.\n${String(error.stderr ?? error.message).trim()}\nIf the Firebase CLI is not signed in, run: firebase login`);
}
const said = Object.entries(counts).map(([kind, n]) => `${n} ${kind}`).join(", ");
console.log(`backfill-activity: wrote ${total} lines (${said})${emulator ? " in the emulator" : ""}.`);
