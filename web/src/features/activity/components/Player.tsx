import { useEffect, useMemo, useState } from "react";
import { resolveLink } from "../../../lib/reader";
import { playerOf, readMessage, type Video } from "../lib/players";
import { RichText } from "./Glyph";

const SITE_NAME = { instagram: "Instagram", tiktok: "TikTok" } as const;

/**
 * A message's or a reply's words with its Instagram or TikTok video playing
 * in place under them, in the site's own player (exception 36). A message
 * that is only the video's address shows the player alone. Nothing is
 * stored: the player comes from the words each time.
 *
 * Inputs: text — the stored words; className — "fp-t" (a post) or "rp-t"
 * (a reply, whose player is smaller, as its GIF is).
 * Output: the words (when there are any to show), then the player.
 * Examples (checked on the emulator at 390 px and 1650 px):
 *   "https://www.instagram.com/reel/C6HpUPegvtc/"   → Instagram's player alone; a tap on it plays the reel in place
 *   "this one 🔥 https://vt.tiktok.com/ZS9bVfWa6/" → the words with "vt.tiktok.com/ZS9bVfWa6" as a link, then TikTok's player
 *   a short link the reader cannot follow         → the words, the address a plain link that opens the site
 */
export function MessageText({ text, className }: { text: string; className: "fp-t" | "rp-t" }) {
  const message = useMemo(() => readMessage(text), [text]);
  const shown = usePlayer(message.video);
  const words = !message.linkOnly || shown.kind === "link";
  return (
    <>
      {words && <RichText className={className} text={text} />}
      {message.video && shown.kind === "quiet" && (
        <a className="vp-quiet" href={message.video.href} target="_blank" rel="noopener noreferrer">
          Watch on {SITE_NAME[message.video.site]}
        </a>
      )}
      {message.video && (shown.kind === "frame" || shown.kind === "looking") && (
        <Player video={message.video} src={shown.kind === "frame" ? shown.src : undefined} small={className === "rp-t"} />
      )}
    </>
  );
}

/**
 * The player's box: a fixed portrait size that holds its place before the
 * frame loads, with a quiet "Watch on …" under the frame until it does.
 *
 * Inputs: the video; src — the player's address (undefined while a short
 * link is looked up); small — a reply's size.
 * Output: the box. The frame mounts once and is never moved, so a re-render
 * of the Feed (a new line, a reaction, the minute clock) leaves a playing
 * video playing.
 * Examples (checked on the emulator): a reel → the box, then Instagram's frame over the link once it loads
 */
function Player({ video, src, small }: { video: Video; src: string | undefined; small: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const name = SITE_NAME[video.site];
  return (
    <div className={`vp ${video.site}${small ? " small" : ""}`}>
      {src && (
        <iframe
          src={src}
          title={`${name} video`}
          loading="lazy"
          allow="fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
        />
      )}
      {!loaded && (
        <a className="vp-wait" href={video.href} target="_blank" rel="noopener noreferrer">
          Watch on {name}
        </a>
      )}
    </div>
  );
}

type Shown = { kind: "frame"; src: string } | { kind: "looking" } | { kind: "link" } | { kind: "quiet" };

const KEPT = "travel.player.";
// The only addresses a kept value may be: the ones playerOf makes.
const PLAYER = /^https:\/\/www\.(?:instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+\/embed\/|tiktok\.com\/player\/v1\/\d+)$/;
// One lookup per short link for the page's life; a failure is forgotten so the next draw asks again.
const asking = new Map<string, Promise<string | null>>();

/**
 * What a message's video shows: its player, a lookup in progress, a plain
 * link, or the quiet "Watch on …" link under Save-Data or reduced data.
 * navigator.onLine is not asked: iOS Safari in the simulator reports false
 * while online (checked 25 Nov 2026). Offline, the frame shows the
 * browser's own error in its box; the site's own logo in each player
 * links out once it loads. A short link's player is kept on this device, so each
 * device asks the link reader once per link.
 *
 * Inputs: video — from readMessage, or null.
 * Output: what to show; it changes once, when a lookup ends.
 * Examples (checked on the emulator):
 *   a direct reel link               → { kind: "frame", src: Instagram's embed address } at once
 *   a TikTok short link, first time  → "looking", then "frame"; the next visit is "frame" at once
 *   the reader refuses or is down    → "looking", then "link" (not kept)
 */
function usePlayer(video: Video | null): Shown {
  const [shown, setShown] = useState<Shown>(() => firstShown(video));
  const lookup = shown.kind === "looking" ? video?.lookup : undefined;
  useEffect(() => {
    if (!lookup) return;
    let live = true;
    let asked = asking.get(lookup);
    if (!asked) {
      asked = resolveLink(lookup).then((target) => {
        const src = target ? playerAt(target) : null;
        if (src) keep(lookup, src);
        else asking.delete(lookup);
        return src;
      });
      asking.set(lookup, asked);
    }
    void asked.then((src) => live && setShown(src ? { kind: "frame", src } : { kind: "link" }));
    return () => {
      live = false;
    };
  }, [lookup]);
  return shown;
}

function firstShown(video: Video | null): Shown {
  if (!video) return { kind: "link" };
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData || matchMedia("(prefers-reduced-data: reduce)").matches) return { kind: "quiet" };
  if (video.player) return { kind: "frame", src: video.player };
  const kept = video.lookup && readKept(video.lookup);
  if (kept) return { kind: "frame", src: kept };
  return video.lookup ? { kind: "looking" } : { kind: "link" };
}

/** The player for a short link's target, or null when it is not a video (a dead TikTok link lands on the home page). */
function playerAt(address: string): string | null {
  try {
    return playerOf(new URL(address));
  } catch {
    return null;
  }
}

function readKept(lookup: string): string | null {
  try {
    const kept = localStorage.getItem(KEPT + lookup);
    return kept && PLAYER.test(kept) ? kept : null;
  } catch {
    return null;
  }
}

function keep(lookup: string, src: string) {
  try {
    localStorage.setItem(KEPT + lookup, src);
  } catch {
    // Private mode or a full store: the next visit asks again.
  }
}
