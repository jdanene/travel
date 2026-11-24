import { useEffect, useRef, useState } from "react";
import { klipyCategories, klipyItems, KlipyError, type KlipyCategory, type KlipyItem, type KlipyKind } from "../lib/klipy";

interface GifBrowserProps {
  kind: KlipyKind;
  /** Posts the picked GIF or sticker. */
  onPick: (item: KlipyItem) => void;
}

/** How long the search waits after the last key, so a word costs one call of the hundred an hour. */
const SEARCH_WAIT_MS = 350;

type List = { title: string; words: string };
type Load<T> = { state: "loading" } | { state: "ready"; value: T } | { state: "failed"; busy: boolean };

/**
 * Discord's GIF tab, on KLIPY: "Search KLIPY" (the placeholder KLIPY's
 * terms require), then a grid of tiles, "Trending" first, each a dimmed
 * GIF with its word in white. A tile or a search opens a two-column
 * masonry in KLIPY's order; scrolling to its foot loads the next page.
 * A failed or slow call shows a short line and "Try again" (nothing
 * retries by itself); a search with no results says so.
 *
 * Inputs: the kind (GIFs or stickers) and what a pick does.
 * Output: the tab's content.
 * Examples (checked against the API at 375 px and 1650 px):
 *   tap "hello"       → hello GIFs in two columns; ‹ goes back to the tiles
 *   search "asdfqwer" → "No GIFs found"
 *   offline           → "GIFs didn't load." and "Try again"
 */
export function GifBrowser({ kind, onPick }: GifBrowserProps) {
  const noun = kind === "gifs" ? "GIFs" : "stickers";
  const [typed, setTyped] = useState("");
  const [list, setList] = useState<List | null>(null);
  const [tiles, setTiles] = useState<Load<KlipyCategory[]>>({ state: "loading" });
  const [tries, setTries] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setTiles({ state: "loading" });
    klipyCategories(kind).then(
      (value) => live && setTiles({ state: "ready", value }),
      (error: unknown) => live && setTiles({ state: "failed", busy: error instanceof KlipyError && error.status === 429 }),
    );
    return () => {
      live = false;
    };
  }, [kind, tries]);

  // A search waits for a pause in typing; clearing the field goes back to the tiles.
  useEffect(() => {
    const words = typed.trim();
    const wait = window.setTimeout(() => setList(words ? { title: words, words } : null), words ? SEARCH_WAIT_MS : 0);
    return () => window.clearTimeout(wait);
  }, [typed]);

  // Braces: scrollTo returns a promise in newer browsers, and an effect may return only a cleanup.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [list]);

  return (
    <div className="gb">
      <label className="eb-search">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="i">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5 20 20" />
        </svg>
        <input type="search" value={typed} placeholder="Search KLIPY" aria-label={`Search KLIPY ${noun}`} enterKeyHint="search" autoComplete="off" onChange={(event) => setTyped(event.target.value)} />
      </label>
      <div className="gb-scroll" ref={scroller}>
        {list ? (
          <>
            <div className="gb-head">
              <button
                type="button"
                className="gb-back"
                aria-label="Back"
                onClick={() => {
                  setTyped("");
                  setList(null);
                }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" className="i" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <h3>{list.title}</h3>
            </div>
            <Masonry key={`${kind}|${list.words}`} kind={kind} words={list.words} noun={noun} root={scroller} onPick={onPick} />
          </>
        ) : (
          <>
            {tiles.state === "loading" && <div className="gb-tiles" aria-busy="true">{Array.from({ length: 8 }, (_, at) => <span key={at} className="gb-tile ghost" />)}</div>}
            {tiles.state === "failed" && <Failed noun={noun} busy={tiles.busy} onRetry={() => setTries(tries + 1)} />}
            {tiles.state === "ready" && (
              <div className="gb-tiles">
                <button type="button" className="gb-tile trending" onClick={() => setList({ title: `Trending ${noun}`, words: "" })}>
                  <span>
                    <svg viewBox="0 0 24 24" width="20" height="20" className="i" aria-hidden="true">
                      <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
                    </svg>
                    Trending {noun}
                  </span>
                </button>
                {tiles.value.map((tile) => (
                  <button key={tile.query} type="button" className="gb-tile" onClick={() => setList({ title: tile.label, words: tile.query })}>
                    <img src={tile.preview} alt="" loading="lazy" decoding="async" />
                    <span>{tile.label}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <p className="gb-credit">Powered by KLIPY</p>
    </div>
  );
}

/** The bounded failure line: what happened and one "Try again". */
function Failed({ noun, busy, onRetry }: { noun: string; busy: boolean; onRetry: () => void }) {
  return (
    <p className="eb-note gb-note" role="status">
      {busy ? `Too many ${noun} searches for now. Wait a minute, then` : `${noun[0].toUpperCase()}${noun.slice(1)} didn't load.`}{" "}
      <button type="button" className="eb-retry" onClick={onRetry}>
        {busy ? "try again" : "Try again"}
      </button>
    </p>
  );
}

/**
 * The results in two columns, each item placed in the shorter column so
 * KLIPY's order reads left to right, top to bottom. Each tile keeps its
 * GIF's shape before it loads. The next page loads when the foot nears.
 * Inputs: the kind, the words ("" for trending), the noun for messages, the scroll box, and what a pick does.
 * Output: the masonry, or its loading, empty or failure line.
 * Examples (checked on screen): trending GIFs → 24 tiles; scrolling to the foot → 24 more
 */
function Masonry({ kind, words, noun, root, onPick }: { kind: KlipyKind; words: string; noun: string; root: React.RefObject<HTMLDivElement>; onPick: (item: KlipyItem) => void }) {
  const [items, setItems] = useState<KlipyItem[]>([]);
  const [page, setPage] = useState(1);
  const [load, setLoad] = useState<{ state: "loading" | "ready" } | { state: "failed"; busy: boolean }>({ state: "loading" });
  const [more, setMore] = useState(false);
  const [tries, setTries] = useState(0);
  const foot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setLoad({ state: "loading" });
    klipyItems(kind, words, page).then(
      (answer) => {
        if (!live) return;
        setItems((old) => {
          const seen = new Set(old.map((item) => item.id));
          return [...old, ...answer.items.filter((item) => !seen.has(item.id))];
        });
        setMore(answer.more);
        setLoad({ state: "ready" });
      },
      (error: unknown) => live && setLoad({ state: "failed", busy: error instanceof KlipyError && error.status === 429 }),
    );
    return () => {
      live = false;
    };
  }, [kind, words, page, tries]);

  useEffect(() => {
    const node = foot.current;
    if (!node || !more || load.state !== "ready") return;
    const watch = new IntersectionObserver((seen) => seen[0].isIntersecting && setPage((old) => old + 1), { root: root.current, rootMargin: "240px" });
    watch.observe(node);
    return () => watch.disconnect();
  }, [more, load.state, root]);

  const columns: KlipyItem[][] = [[], []];
  const heights = [0, 0];
  for (const item of items) {
    const shorter = heights[0] <= heights[1] ? 0 : 1;
    columns[shorter].push(item);
    heights[shorter] += item.thumb.height / item.thumb.width;
  }

  return (
    <>
      {items.length > 0 && (
        <div className={`gb-masonry${kind === "stickers" ? " stickers" : ""}`}>
          {columns.map((column, at) => (
            <div key={at} className="gb-col">
              {column.map((item) => (
                <button key={item.id} type="button" className="gb-item" style={{ aspectRatio: `${item.thumb.width} / ${item.thumb.height}` }} aria-label={item.title || "GIF"} title={item.title} onClick={() => onPick(item)}>
                  <img src={item.thumb.url} alt="" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      {load.state === "ready" && items.length === 0 && <p className="eb-note gb-note">No {noun} found</p>}
      {load.state === "loading" && <p className="eb-note gb-note">Loading {noun}…</p>}
      {load.state === "failed" && <Failed noun={noun} busy={load.busy} onRetry={() => setTries(tries + 1)} />}
      <div ref={foot} />
    </>
  );
}
