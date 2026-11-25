/**
 * Writes one page file per shared events address, so a link preview shows
 * the event and not the invitation (owner, 25 Nov 2026: "when I share, the
 * preview should be the event"). Messages and WhatsApp read the page file's
 * og: tags before any script runs, so the event's words and picture must be
 * in a file Hosting serves at that address. Hosting serves a file before
 * its /trip/** rewrite, so these files win for their own addresses and
 * every other address still gets the app.
 *
 * Usage, from the repo root, after the app is built and stamp-preview has
 * run, before the hosting deploy: node scripts/stamp-event-previews.mjs
 *
 * It reads the trip in local/trip.state.json with the Firebase CLI (its
 * info, its events and its venues) and the built public/app/index.html, and
 * writes copies of that page, differing only in <title> and the og: tags:
 *   public/trip/<tripId>/events/index.html           the whole list
 *   public/trip/<tripId>/events/<showId>/index.html  one event
 * The list reads "Events · Bali · Koh Phangan" with the trip's summary. An
 * event reads "Peggy Gou · Sat 13 Feb 2027" with "Savaya · Uluwatu, Bali,
 * Indonesia", and its picture is the event's own (photoUrl), else the
 * venue's, else the trip's. The words come from the page's own rules
 * (whenLine and showPlace in web/src/features/parties/lib/detail.ts).
 * public/trip/ is git-ignored: its paths hold the trip id.
 *
 * Each run removes the trip's events folder first, so an event that left
 * the trip loses its file. An event added after a deploy has no file until
 * the next one; its link still opens, with the list's preview.
 *
 * It never fails the deploy: when a read fails or the built page is
 * missing it prints a warning, writes nothing (files from an earlier run
 * stay) and exits 0. Each read gives up after 60 seconds. No step retries.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { register } from "node:module";

// The page's modules import their neighbours without the ".ts" ending, as Vite allows.
register(
  "data:text/javascript," +
    encodeURIComponent(
      'export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (s.startsWith(".") && !s.endsWith(".ts")) return next(s + ".ts", c); throw e; } }',
    ),
);
const { showPlace, whenLine } = await import("../web/src/features/parties/lib/detail.ts");
const { escapeHtml } = await import("../web/src/lib/invite.ts");

const PROJECT = "travel-ca8f9";
const SITE = `https://${PROJECT}.web.app`;
const STATE_FILE = "local/trip.state.json";
const PAGE = "public/app/index.html";
/** A show's id as the page's route reads it (web/src/app/lib/route.ts). */
const SHOW_ID = /^[A-Za-z0-9_-]{1,200}$/;

function warn(message) {
  console.warn(`stamp-event-previews: warning: ${message}`);
}

/**
 * Reads one branch of the trip with the Firebase CLI.
 * Inputs: path — from the database root. Output: the value, or undefined after a warning.
 * Examples (checked against the live trip): "/trips/<id>/info" → { name, summary, destinations, … }
 */
function read(path) {
  try {
    const said = execFileSync("firebase", ["database:get", path, "--project", PROJECT], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60_000 });
    return JSON.parse(said);
  } catch (error) {
    warn(`could not read ${path.replace(/\/trips\/[^/]+/, "/trips/<trip>")}; the event previews were not written.\n${String(error.stderr || error.message).trim()}`);
    return undefined;
  }
}

/**
 * Makes one page file: the built page with its <title>, og:title,
 * og:description and og:image replaced. The picture's size tags go, since
 * they describe the trip's own picture.
 *
 * Inputs: html — the built page; title, description — plain text; image — an https address.
 * Output: the new text, or null when the page has no og:title.
 * Examples (checked by opening the files): "Peggy Gou · Sat 13 Feb 2027" → that og:title and <title>; a "$" or a quote in a name stays as written, escaped
 */
function page(html, { title, description, image }) {
  if (!/<meta property="og:title" content="[^"]*">/.test(html)) return null;
  const set = (text, tag, value) => text.replace(new RegExp(`(<meta property="${tag}" content=")[^"]*(")`), (_, open, close) => open + escapeHtml(value) + close);
  let out = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(title)}</title>`);
  out = set(out, "og:title", title);
  out = set(out, "og:description", description);
  out = set(out, "og:image", image);
  return out.replace(/<meta property="og:image:(width|height)" content="[^"]*">/g, "");
}

const https = (value) => (typeof value === "string" && value.startsWith("https://") && value.length <= 500 ? value : undefined);

if (!existsSync(STATE_FILE)) warn(`${STATE_FILE} is missing, so there is no trip to read.`);
else if (!existsSync(PAGE)) warn(`${PAGE} is missing; build the app first.`);
else {
  const { tripId } = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  const info = read(`/trips/${tripId}/info`);
  const shows = info === undefined ? undefined : read(`/trips/${tripId}/parties/shows`);
  const places = shows === undefined ? undefined : read(`/trips/${tripId}/places`);
  const html = readFileSync(PAGE, "utf8");
  const fallback = /<meta property="og:image" content="([^"]*)"/.exec(html)?.[1] ?? `${SITE}/og2.jpg`;
  if (info && shows !== undefined && places !== undefined) {
    const trip = { info, places: places ?? {} };
    const name = typeof info.name === "string" && info.name.trim() ? info.name.trim() : "The trip";
    const folder = `public/trip/${tripId}/events`;
    const list = page(html, { title: `Events · ${name}`, description: typeof info.summary === "string" && info.summary.trim() ? info.summary.trim() : "Who's playing", image: fallback });
    if (list === null) warn(`${PAGE} has no og:title meta tag; the event previews were not written.`);
    else {
      rmSync(folder, { recursive: true, force: true });
      mkdirSync(folder, { recursive: true });
      writeFileSync(`${folder}/index.html`, list);
      let written = 0;
      for (const [id, show] of Object.entries(shows ?? {})) {
        // An id the page's route would not open, or a record of another shape, gets no file.
        if (!SHOW_ID.test(id) || typeof show?.artist !== "string" || typeof show.date !== "string" || typeof show.venue !== "string") continue;
        const place = showPlace(show, trip);
        const one = page(html, { title: `${show.artist.trim()} · ${whenLine(show)}`, description: place.where, image: https(show.photoUrl) ?? https(place.photoUrl) ?? fallback });
        mkdirSync(`${folder}/${id}`, { recursive: true });
        writeFileSync(`${folder}/${id}/index.html`, one);
        written++;
      }
      console.log(`stamp-event-previews: wrote the list's preview and ${written} event previews.`);
    }
  }
}
