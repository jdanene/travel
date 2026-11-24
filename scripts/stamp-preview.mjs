/**
 * Writes the organizer's invite title into the link preview. Messages and
 * WhatsApp read the page file, not the app, so the title the organizer set
 * in the "Invite" sheet (trips/{tripId}/info/inviteTitle) reaches previews
 * only when it is in the files the deploy serves.
 *
 * Usage, from the repo root, after the app is built and before the hosting
 * deploy: node scripts/stamp-preview.mjs [--emulator]
 *   --emulator  reads the database emulator (127.0.0.1:9000) over its REST
 *               address, because the CLI's database:get there misses the
 *               app's namespace, and the emulator's trip
 *               (local/trip.state.emulator.json).
 *
 * It reads the title of the trip in local/trip.state.json with the Firebase
 * CLI, as create-trip does; with no title saved it uses the default,
 * "Indonesia/Thailand Trip 2027". It writes "You're invited to “…”. Tap
 * here to access", HTML-escaped, into og:title and <title> of
 * public/index.html, and into og:title of the built public/app/index.html
 * (its <title> stays the trip's name, for the browser tab). Nothing else in
 * the files changes, and a second run gives the same files.
 *
 * It never fails the deploy: when the read fails, or a file is missing or
 * has no og:title, it prints a warning, leaves that file as it was (the
 * current title stays) and exits 0. The read gives up after 60 seconds.
 * No step retries.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_INVITE_TITLE, escapeHtml, inviteLine, MAX_INVITE_TITLE } from "../web/src/lib/invite.ts";

const PROJECT = "travel-ca8f9";
const emulator = process.argv.includes("--emulator");
const STATE_FILE = emulator ? "local/trip.state.emulator.json" : "local/trip.state.json";
/** The splash every shared link opens, and the app the /trip/ links open; only the splash's <title> changes. */
const FILES = [
  { path: "public/index.html", title: true },
  { path: "public/app/index.html", title: false },
];

function warn(message) {
  console.warn(`stamp-preview: warning: ${message}`);
}

/**
 * Reads the saved invite title: with the Firebase CLI, or from the
 * emulator's REST address with --emulator.
 *
 * Inputs: none; the trip id comes from the state file.
 * Output: the title, trimmed; the default when none is saved (or the saved
 * value is not a title of 1 to 60 characters); or null when the read
 * failed, after a warning.
 * Examples (checked against the emulator and the live trip):
 *   nothing saved              → "Indonesia/Thailand Trip 2027"
 *   "Bali 2027" saved          → "Bali 2027"
 *   the CLI is not signed in   → null, and a warning with the CLI's words
 */
async function readTitle() {
  if (!existsSync(STATE_FILE)) {
    warn(`${STATE_FILE} is missing, so there is no trip to read. The link preview keeps its current title.`);
    return null;
  }
  let said;
  try {
    const { tripId } = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    const path = `trips/${tripId}/info/inviteTitle`;
    if (emulator) {
      const response = await fetch(`http://127.0.0.1:9000/${path}.json?ns=${PROJECT}-default-rtdb`, {
        headers: { Authorization: "Bearer owner" },
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) throw new Error(`the emulator answered ${response.status}`);
      said = await response.text();
    } else {
      said = execFileSync("firebase", ["database:get", `/${path}`, "--project", PROJECT], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 60_000,
      });
    }
  } catch (error) {
    warn(`could not read the invite title; the link preview keeps its current title.\n${String(error.stderr || error.message).trim()}\nIf the Firebase CLI is not signed in, run: firebase login`);
    return null;
  }
  let value;
  try {
    value = JSON.parse(said);
  } catch {
    warn(`the read did not answer in JSON; the link preview keeps its current title.\n${said.trim()}`);
    return null;
  }
  const title = typeof value === "string" ? value.trim() : "";
  return title.length >= 1 && title.length <= MAX_INVITE_TITLE ? title : DEFAULT_INVITE_TITLE;
}

/**
 * Puts the line into one page file's og:title, and into its <title> when
 * asked. The line is already escaped, so it holds no quote or "<" that could
 * end the tag; a function replacer keeps a "$" in it as it is.
 *
 * Inputs: html — the file's text; line — the escaped line; withTitle —
 * whether <title> changes too.
 * Output: the new text, or null when the file has no og:title.
 * Examples (checked by running it on both files twice):
 *   the splash, "Bali &amp; Co"  → og:title and <title> read "You’re invited to “Bali &amp; Co”. Tap here to access"
 *   the built app                → og:title changes; <title> stays "Bali · Koh Phangan"
 *   a second run                 → the same text
 */
function stamp(html, line, withTitle) {
  const ogTitle = /(<meta property="og:title" content=")[^"]*(")/;
  if (!ogTitle.test(html)) return null;
  const out = html.replace(ogTitle, (_, open, close) => open + line + close);
  return withTitle ? out.replace(/<title>[^<]*<\/title>/, () => `<title>${line}</title>`) : out;
}

const title = await readTitle();
if (title !== null) {
  const line = escapeHtml(inviteLine(title));
  for (const file of FILES) {
    try {
      if (!existsSync(file.path)) {
        warn(`${file.path} is missing; build the app first. It was not stamped.`);
        continue;
      }
      const html = readFileSync(file.path, "utf8");
      const next = stamp(html, line, file.title);
      if (next === null) warn(`${file.path} has no og:title meta tag; it was not stamped.`);
      else if (next !== html) writeFileSync(file.path, next);
    } catch (error) {
      warn(`${file.path} was not stamped: ${error.message}`);
    }
  }
  console.log(`stamp-preview: the link preview reads: ${inviteLine(title)}`);
}
