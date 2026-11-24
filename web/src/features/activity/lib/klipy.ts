/**
 * GIFs and stickers from KLIPY (docs.klipy.com; Discord's GIF provider
 * since Tenor's API closed in 2026). The key is VITE_KLIPY_KEY, read at
 * build time; with no key the picker shows only Emoji.
 *
 * KLIPY's terms shape this module: requests go from the browser straight
 * to api.klipy.com, pictures load from the addresses it returns, results
 * keep its order, and its content is never mixed with another source.
 * A test key allows 100 calls an hour, so every answer is kept for the
 * page's life and nothing retries by itself: each call waits at most 8 s
 * and a failure (or a 429) shows "Try again".
 */

const KEY = import.meta.env.VITE_KLIPY_KEY as string | undefined;
const API = "https://api.klipy.com/api/v1";
const WAIT_MS = 8000;
const PAGE = 24;

/** True when this build has a KLIPY key. */
export const klipyOn = Boolean(KEY);

/** What the picker asks KLIPY for. */
export type KlipyKind = "gifs" | "stickers";

/** One picture at one size. */
export interface Picture {
  url: string;
  width: number;
  height: number;
}

/** One GIF or sticker: the small picture for the grid and the larger one to post. */
export interface KlipyItem {
  id: string;
  title: string;
  thumb: Picture;
  full: Picture;
}

/** A browsing tile: its label, the words it searches, and its picture. */
export interface KlipyCategory {
  label: string;
  query: string;
  preview: string;
}

/** One page of results, and whether there is another. */
export interface KlipyPage {
  items: KlipyItem[];
  more: boolean;
}

/** A failed call: the HTTP status, or 0 when the network or the wait gave out. */
export class KlipyError extends Error {
  constructor(readonly status: number) {
    super(status === 429 ? "KLIPY: too many calls" : `KLIPY answered ${status || "nothing"}`);
  }
}

const kept = new Map<string, Promise<unknown>>();

/** One GET to KLIPY, kept for the page's life; a failure is forgotten so "Try again" asks again. */
function ask<T>(path: string, read: (body: unknown) => T): Promise<T> {
  const old = kept.get(path);
  if (old) return old as Promise<T>;
  const asked = fetch(`${API}/${KEY}/${path}`, { signal: AbortSignal.timeout(WAIT_MS) })
    .catch(() => {
      throw new KlipyError(0);
    })
    .then(async (answer) => {
      if (!answer.ok) throw new KlipyError(answer.status);
      const body = (await answer.json()) as { result?: boolean; data?: unknown };
      if (!body.result) throw new KlipyError(answer.status);
      return read(body.data);
    })
    .catch((error: unknown) => {
      kept.delete(path);
      throw error;
    });
  kept.set(path, asked);
  return asked;
}

type Sizes = Partial<Record<"hd" | "md" | "sm" | "xs", Partial<Record<"webp" | "gif", Picture>>>>;

/** The first size and format KLIPY sent, in the order asked. */
function pick(file: Sizes, sizes: ("hd" | "md" | "sm" | "xs")[]): Picture | undefined {
  for (const size of sizes) {
    const found = file[size]?.webp ?? file[size]?.gif;
    if (found?.url && found.width > 0 && found.height > 0) return { url: found.url, width: found.width, height: found.height };
  }
  return undefined;
}

/**
 * Reads one page of KLIPY's answer. Only items with pictures are drawn:
 * this app asks for no ads, so every item should have them.
 * Inputs: data — KLIPY's "data" object. Output: the page.
 * Examples (checked against the API): trending GIFs → 24 items, more: true
 */
function readPage(data: unknown): KlipyPage {
  const page = data as { data?: { id: number | string; title?: string; file?: Sizes }[]; has_next?: boolean };
  const items: KlipyItem[] = [];
  for (const item of page.data ?? []) {
    const thumb = item.file && pick(item.file, ["sm", "md", "xs"]);
    const full = item.file && pick(item.file, ["md", "hd", "sm"]);
    if (thumb && full) items.push({ id: String(item.id), title: item.title ?? "", thumb, full });
  }
  return { items, more: Boolean(page.has_next) };
}

const FILTERS = `per_page=${PAGE}&content_filter=medium&format_filter=webp,gif`;

/**
 * KLIPY's trending GIFs or stickers, or its results for some words.
 * Inputs: the kind, the words ("" for trending), and the page (from 1).
 * Output: the page; rejects with KlipyError.
 * Examples (checked against the API on 24 Nov 2026):
 *   gifs, "", 1      → 24 trending GIFs
 *   gifs, "hello", 1 → hello GIFs, in KLIPY's order
 */
export function klipyItems(kind: KlipyKind, words: string, page: number): Promise<KlipyPage> {
  const q = words.trim();
  const path = q ? `${kind}/search?q=${encodeURIComponent(q)}&page=${page}&${FILTERS}` : `${kind}/trending?page=${page}&${FILTERS}`;
  return ask(path, readPage);
}

/**
 * KLIPY's browsing tiles for GIFs or stickers ("hello", "lol", "love", …).
 * Inputs: the kind. Output: the tiles; rejects with KlipyError.
 * Examples (checked against the API): gifs → smile, aww, high five, …
 */
export function klipyCategories(kind: KlipyKind): Promise<KlipyCategory[]> {
  return ask(`${kind}/categories`, (data) =>
    ((data as { categories?: { category?: string; query?: string; preview_url?: string }[] }).categories ?? []).flatMap((tile) =>
      tile.category && tile.query && tile.preview_url ? [{ label: tile.category, query: tile.query, preview: tile.preview_url }] : [],
    ),
  );
}
