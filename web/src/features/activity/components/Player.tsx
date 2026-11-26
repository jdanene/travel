import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Icon } from "../../../components/Icon";
import { postCard, readCard, resolveLink, type PostCard } from "../../../lib/reader";
import { instagramCrop, playerOf, readMessage, type Video } from "../lib/players";
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
 * The player's box: a fixed size that holds its place before the frame
 * loads, with a quiet "Watch on …" under the frame until it does. TikTok's
 * frame is its video and nothing else, so it shows whole. Instagram's frame
 * wraps the picture in a header, a "View more on Instagram" bar, icons,
 * likes and a comment line; the box shows only the picture (exception 40):
 * the frame sits behind the box, moved up by its header and cut at the
 * picture's foot, and a reel's frame is also widened until its 9:16 video
 * fills the box (lib/players.ts instagramCrop). What the cut takes away,
 * the ways to Instagram, comes back with the account (exception 42): a
 * still is a card as in Instagram's own chat, the account's picture and
 * name above the picture and the caption's start under it; a video has
 * the account over its top corner and, until it is pressed, Instagram's
 * small video mark in its bottom left corner. When the account cannot be read, one
 * small Instagram mark sits in the box's top corner instead.
 *
 * Inputs: the video; src — the player's address (undefined while a short
 * link is looked up); small — a reply's size.
 * Output: the box. The frame mounts once and is never moved, so a re-render
 * of the Feed (a new line, a reaction, the minute clock) leaves a playing
 * video playing.
 * Examples (checked on the emulator, iPhone simulator and 1650 px):
 *   a reel            → a 9:16 box filled by the video and its play button; no header, no words; a tap plays it in place
 *   a photo post      → a card: "keinemusik and adamport" with its picture, the photo in its own shape, "keinemusik first keinemusik show of 2027 …" on two lines
 *   a reel            → "lupeslively" with its picture over the video's top left corner
 *   the name row, or the name over a video → opens the post on Instagram in a new tab
 *   the reader down   → the photo alone, with the Instagram mark in its corner
 *   a TikTok          → TikTok's frame, whole, as before
 */
function Player({ video, src, small }: { video: Video; src: string | undefined; small: boolean }) {
  const [loaded, setLoaded] = useState(false);
  // A new round is a new frame: how an Instagram video that left the screen is stopped.
  const [round, setRound] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const instagram = video.site === "instagram";
  // Whether this frame was pressed: the reel mark leaves once the video is playing.
  const [pressed, setPressed] = useState(false);
  const tiktok = useTikTokWarm(frame, video.site === "tiktok");
  useStopOffScreen(box, frame, video.site, setPressed, tiktok.rest, () => {
    setLoaded(false);
    setPressed(false);
    setRound((was) => was + 1);
  });
  const reported = useReportedSize(frame, instagram);
  const card = useCard(instagram ? src : undefined);
  const crop = instagram ? instagramCrop(!!src && (src.includes("/reel/") || card?.kind === "video"), reported) : null;
  const name = SITE_NAME[video.site];
  const account = card && (
    <span className="ig-name">
      {card.also ? `${card.name} and ${card.also}` : card.name}
      {card.verified && <Verified />}
    </span>
  );
  // TikTok's player starts muted on load and is paused at once (useTikTokWarm), so a tap plays at once.
  const frameSrc = src && video.site === "tiktok" ? `${src}?autoplay=1&rel=0` : src;
  const frameBox = (
    <div ref={box} className={`vp ${video.site}${crop?.zoom ? " zoom" : ""}${small ? " small" : ""}`} style={crop ? { aspectRatio: `1 / ${crop.tall}` } : undefined}>
      {src && (
        <iframe
          key={round}
          ref={frame}
          src={frameSrc}
          // The frame never scrolls inside its box (owner, 26 Nov 2026: "u can move the insta around").
          scrolling="no"
          title={`${name} video`}
          loading="lazy"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
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
      {tiktok.ready && (
        // The warmed player's first tap: it starts the video with sound, then steps aside for TikTok's own controls.
        <button type="button" className="vp-tap" aria-label="Play the TikTok video" onClick={tiktok.play} />
      )}
      {instagram && loaded && !card && (
        <a className="vp-out" href={video.href} target="_blank" rel="noopener noreferrer" aria-label="Watch on Instagram">
          <Icon name="insta" size={16} />
        </a>
      )}
      {instagram && crop?.zoom && loaded && !pressed && (
        // Instagram's mark for a video, in the corner where its own chat puts it; it does nothing.
        <span className="ig-reel" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" focusable="false">
            <path d="M9 7.2v9.6a.6.6 0 0 0 .92.5l7.3-4.8a.6.6 0 0 0 0-1l-7.3-4.8a.6.6 0 0 0-.92.5Z" fill="currentColor" />
          </svg>
        </span>
      )}
      {card && crop?.zoom && (
        // A video: the account sits over its top corner, as in Instagram's own chat; it is the way to Instagram.
        <a className="ig-over" href={video.href} target="_blank" rel="noopener noreferrer">
          <Avatars card={card} />
          {account}
          <span className="sr-only">, Watch on Instagram</span>
        </a>
      )}
    </div>
  );
  if (!instagram) return frameBox;
  // A still: Instagram's chat card, with the account above the picture and the caption's start under it.
  // The three places keep their order whether filled or not, so the frame is never remounted.
  const still = !!card && !crop?.zoom;
  return (
    <div className={`ig${still ? " card" : ""}${small ? " small" : ""}`}>
      {still && card && (
        <a className="ig-head" href={video.href} target="_blank" rel="noopener noreferrer">
          <Avatars card={card} />
          {account}
          <span className="sr-only">, Watch on Instagram</span>
        </a>
      )}
      {frameBox}
      {still && card?.caption && (
        <p className="ig-cap">
          <b>{card.name}</b> {card.caption}
        </p>
      )}
    </div>
  );
}

/** An account's round picture; an empty disc when it has none or the picture does not load. */
function Avatar({ url, className = "ig-avatar" }: { url: string | undefined; className?: string }) {
  const [failed, setFailed] = useState(false);
  return <span className={className}>{url && !failed && <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />}</span>;
}

/** The post's account picture, or, for a post by two accounts, both pictures overlapping, as Instagram's chat draws them. */
function Avatars({ card }: { card: PostCard }) {
  if (!card.also || !card.alsoAvatarUrl) return <Avatar url={card.avatarUrl} />;
  return (
    <span className="ig-pair">
      <Avatar url={card.alsoAvatarUrl} className="ig-avatar back" />
      <Avatar url={card.avatarUrl} className="ig-avatar front" />
    </span>
  );
}

/** Instagram's verified mark after an account's name: a blue badge with a white check. */
function Verified() {
  return (
    <svg className="ig-verified" viewBox="0 0 24 24" width="14" height="14" role="img" aria-label="Verified">
      <path d="M12 1.5l2.6 1.9 3.2-.2.9 3.1 2.6 1.9-1 3 1 3-2.6 1.9-.9 3.1-3.2-.2L12 22.5l-2.6-1.9-3.2.2-.9-3.1-2.6-1.9 1-3-1-3 2.6-1.9.9-3.1 3.2.2z" fill="#0095f6" />
      <path d="M7.8 12.3l2.7 2.7 5.7-5.7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// v2: cards kept before 26 Nov 2026 lack the verified mark and the second picture.
const CARD_KEPT = "travel.card2.";
const CARD_KEPT_MS = 12 * 60 * 60 * 1000;
// One read per post for the page's life; a failure is forgotten so the next draw asks again.
const reading = new Map<string, Promise<PostCard | null>>();

/**
 * The account, account picture and caption of an Instagram post, for the
 * card around its frame. Read once through the link reader and kept on
 * this device for 12 hours (the account picture's address stops working
 * after a few days). The reader is sent the post's address and nothing
 * about the trip or the friend.
 *
 * Inputs: src — the post's player address, or undefined (a short link
 * still being looked up, or another site).
 * Output: the card, or null while it is read and when there is none (a
 * private or removed post, the reader down); the Feed then shows the
 * frame alone, with the Instagram mark.
 * Examples (checked on the emulator against the local reader):
 *   a photo post, first time → null, then { name: "keinemusik", also: "adamport", kind: "image", … }; the next visit has it at once
 *   the reader down → null; the next draw asks again
 */
function useCard(src: string | undefined): PostCard | null {
  const post = src?.replace(/embed\/$/, "");
  const [card, setCard] = useState<PostCard | null>(() => (post ? keptCard(post) : null));
  useEffect(() => {
    if (!post || keptCard(post)) return;
    let live = true;
    let asked = reading.get(post);
    if (!asked) {
      asked = readCard(post).then((found) => {
        if (found) keepCard(post, found);
        else reading.delete(post);
        return found;
      });
      reading.set(post, asked);
    }
    void asked.then((found) => live && found && setCard(found));
    return () => {
      live = false;
    };
  }, [post]);
  return card;
}

function keptCard(post: string): PostCard | null {
  try {
    const kept = JSON.parse(localStorage.getItem(CARD_KEPT + post) ?? "null") as { at?: number; card?: unknown } | null;
    return kept && typeof kept.at === "number" && Date.now() - kept.at < CARD_KEPT_MS ? postCard(kept.card) : null;
  } catch {
    return null;
  }
}

function keepCard(post: string, card: PostCard) {
  try {
    localStorage.setItem(CARD_KEPT + post, JSON.stringify({ at: Date.now(), card }));
  } catch {
    // Private mode or a full store: the next visit asks again.
  }
}

/**
 * Stops a video that has left the screen (owner, 26 Nov 2026: "when tick
 * tock or insta is not in the screen view it should stop where it is").
 * TikTok's player takes a "pause" message and keeps its place, so a press
 * on play carries on from there. Instagram's frame takes no message, so a
 * frame that was pressed is replaced by a fresh one: the sound stops, and
 * the video starts from its beginning next time. A frame nobody pressed is
 * left alone. "Pressed" is read from focus: the page loses focus to the
 * frame on a tap (checked in iOS Safari on the simulator).
 *
 * Inputs: box, frame — the player's box and its iframe; site; onPressed —
 * told when the frame is pressed; pauseTikTok — pauses a TikTok and puts
 * its first-tap layer back; renew — replaces the frame with a fresh one.
 * Output: nothing. It watches the box with an IntersectionObserver; "left
 * the screen" is less than a tenth of the box showing, in the Feed's own
 * scroll or the page's.
 * Examples (checked on the iPhone simulator): a playing TikTok scrolled away → paused (its player reports state 2), and play carries on from the same place
 *   a playing reel scrolled away → silent; scrolled back → its first picture and play button
 *   a reel nobody pressed, scrolled away → not reloaded
 */
function useStopOffScreen(box: RefObject<HTMLDivElement | null>, frame: RefObject<HTMLIFrameElement | null>, site: Video["site"], onPressed: (pressed: boolean) => void, pauseTikTok: () => void, renew: () => void) {
  const pressed = useRef(false);
  const onPressedRef = useRef(onPressed);
  onPressedRef.current = onPressed;
  const renewRef = useRef(renew);
  renewRef.current = renew;
  const pauseRef = useRef(pauseTikTok);
  pauseRef.current = pauseTikTok;
  useEffect(() => {
    const element = box.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const onBlur = () => {
      if (document.activeElement !== frame.current) return;
      pressed.current = true;
      onPressedRef.current(true);
    };
    const watcher = new IntersectionObserver(
      ([entry]) => {
        const iframe = frame.current;
        if (!entry || entry.isIntersecting || !iframe) return;
        if (site === "tiktok") {
          pauseRef.current();
        } else if (pressed.current || document.activeElement === iframe) {
          pressed.current = false;
          renewRef.current();
        }
      },
      { threshold: 0.1 },
    );
    window.addEventListener("blur", onBlur);
    watcher.observe(element);
    return () => {
      window.removeEventListener("blur", onBlur);
      watcher.disconnect();
    };
  }, [box, frame, site]);
}

/**
 * Makes a TikTok play at once on its first tap (owner, 25 Nov 2026: "i
 * press play it loads and then plays. can we preload this"). TikTok's
 * player ignores every command until it has played once, and a cold tap
 * waited about 2 s for the video (1,952 ms, measured on the iPhone
 * simulator, 26 Nov 2026). So the frame loads with TikTok's own autoplay,
 * which a browser allows only muted; the moment it plays, this pauses it
 * and turns the sound back on. The video is then loaded and paused on its
 * first picture. TikTok's own first tap on a warmed player only shows its
 * controls, so a clear layer over the frame takes that tap and tells the
 * player to play (175 ms to playing, same check), then steps aside for
 * TikTok's controls. When the video leaves the screen it is paused and the
 * layer comes back, so the next tap plays again at once.
 *
 * Inputs: frame — the TikTok iframe (its address carries autoplay=1 and
 * rel=0, which hides TikTok's "More videos" panel on pause); on — false for
 * another site's frame.
 * Output: ready — whether the layer is up; play — the layer's tap; rest —
 * pauses the video (off screen) and puts the layer back once it has played.
 * When autoplay is blocked (iOS Low Power Mode, a browser setting) the
 * player never plays by itself, ready stays false, and a tap works as
 * before, with TikTok's own wait. Nothing is sent to TikTok but these
 * player commands.
 * Examples (checked on the iPhone simulator, 26 Nov 2026):
 *   a TikTok in the feed → plays muted for a moment on load, then shows its first picture, paused, with no sound
 *   tap it              → plays with sound in about 0.2 s
 *   scroll it away      → paused; back and tap → plays on from there
 */
function useTikTokWarm(frame: RefObject<HTMLIFrameElement | null>, on: boolean) {
  const [ready, setReady] = useState(false);
  const phase = useRef<"cold" | "ready" | "playing">("cold");
  const send = useCallback((type: "play" | "pause" | "mute" | "unMute") => {
    frame.current?.contentWindow?.postMessage({ "x-tiktok-player": true, type }, "https://www.tiktok.com");
  }, [frame]);
  useEffect(() => {
    if (!on) return;
    const hear = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== "https://www.tiktok.com") return;
      const data = readMessageData(event.data) as { "x-tiktok-player"?: unknown; type?: unknown; value?: unknown } | null;
      if (!data?.["x-tiktok-player"] || data.type !== "onStateChange" || data.value !== 1 || phase.current !== "cold") return;
      // The muted autoplay has started: stop it on its first picture and give the sound back.
      send("pause");
      send("unMute");
      phase.current = "ready";
      setReady(true);
    };
    window.addEventListener("message", hear);
    return () => window.removeEventListener("message", hear);
  }, [on, frame, send]);
  const play = useCallback(() => {
    send("unMute");
    send("play");
    phase.current = "playing";
    setReady(false);
  }, [send]);
  const rest = useCallback(() => {
    send("pause");
    if (phase.current === "playing") {
      phase.current = "ready";
      setReady(true);
    }
  }, [send]);
  return { ready, play, rest };
}

/** A message's data as an object: Instagram sends JSON text, TikTok an object. */
function readMessageData(data: unknown): unknown {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * The height Instagram's frame reports for itself, with the frame's width
 * on the page at that moment. The frame posts {"type":"MEASURE",
 * "details":{"height":436}} to the page when it has drawn and when its
 * size changes; nothing is asked of it.
 *
 * Inputs: frame — the iframe; on — false for another site's frame.
 * Output: { width, height } in CSS pixels, or undefined before the first
 * report. A message from another window or another site is not read.
 * Examples (checked on the emulator): a reel in a 284 px frame → { width: 284, height: 563 }; a TikTok → undefined
 */
function useReportedSize(frame: RefObject<HTMLIFrameElement | null>, on: boolean): { width: number; height: number } | undefined {
  const [size, setSize] = useState<{ width: number; height: number }>();
  useEffect(() => {
    if (!on) return;
    const hear = (event: MessageEvent) => {
      const element = frame.current;
      if (!element || event.source !== element.contentWindow || event.origin !== "https://www.instagram.com") return;
      const height = reportedHeight(event.data);
      const width = element.clientWidth;
      if (height) setSize((was) => (was && was.width === width && was.height === height ? was : { width, height }));
    };
    window.addEventListener("message", hear);
    return () => window.removeEventListener("message", hear);
  }, [frame, on]);
  return size;
}

/** The height in a frame's MEASURE message, or null for any other message. */
function reportedHeight(data: unknown): number | null {
  try {
    const said = (typeof data === "string" ? JSON.parse(data) : data) as { type?: unknown; details?: { height?: unknown } } | null;
    const height = said?.type === "MEASURE" ? Number(said.details?.height) : NaN;
    return height > 0 && height < 5000 ? height : null;
  } catch {
    return null;
  }
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
