import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { GROUPS, loadedGroups, loadGroups, recentChoices, searchEmoji, type EmojiItem } from "../lib/emoji";
import { FIRST_SCREEN_CELLS } from "../lib/emojiSet";
import { findEmotes, warmedEmotes } from "../lib/emotes";
import { reactionKey, type EmojiChoice, type Emote } from "../lib/reactions";
import { Glyph } from "./Glyph";

interface EmojiBrowserProps {
  /** True while its panel is open. Without the warm-up (Save-Data), 7TV is asked only then. */
  active: boolean;
  /** The search field's words: "Find the perfect reaction", or "Find the perfect emoji" in the message bar. */
  placeholder: string;
  onPick: (choice: EmojiChoice) => void;
}

type Load<T> = { state: "loading" } | { state: "ready"; value: T } | { state: "failed" };

/** How long the search waits after the last key before asking 7TV, so a word costs one call. */
const SEARCH_WAIT_MS = 350;

/**
 * Discord's emoji grid: a search field, "Frequently Used", 7TV's emotes,
 * then every emoji by group under small grey headings, with a strip of
 * group icons along the foot that jumps to each group and lights the one
 * in view. Search shows the matching emoji, then the matching emotes in
 * their own section. Arrow keys move through the grid; Enter in the field
 * picks the first match.
 *
 * Inputs: the field's placeholder and what a pick does.
 * Output: the grid.
 * Examples (checked on screen at 375 px and 1650 px):
 *   type "fire"   → 🔥 first under "Emoji", fire emotes under "Emotes · 7TV"
 *   tap the 🍔 icon → the grid scrolls to "Food & Drink"; the icon lights
 *   7TV down      → "Emotes didn't load." with "Try again"; the emoji still work
 */
export function EmojiBrowser({ active: open, placeholder, onPick: pickNow }: EmojiBrowserProps) {
  // One stable pick for every cell, so opening or closing the panel never re-renders the ~1,900 cells.
  const latestPick = useRef(pickNow);
  latestPick.current = pickNow;
  const onPick = useCallback((choice: EmojiChoice) => latestPick.current(choice), []);
  const [query, setQuery] = useState("");
  // The warm-up has usually loaded the groups already: then the first render draws them.
  const [groups, setGroups] = useState<Load<Map<number, EmojiItem[]>>>(() => {
    const value = loadedGroups();
    return value ? { state: "ready", value } : { state: "loading" };
  });
  const [emotes, setEmotes] = useState<Load<Emote[]>>({ state: "loading" });
  const [found, setFound] = useState<{ query: string; emoji: EmojiItem[]; emotes: Load<Emote[]> } | null>(null);
  const [active, setActive] = useState("recent");
  const [tries, setTries] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const recent = useMemo(recentChoices, []);
  const searching = query.trim() !== "";

  useEffect(() => {
    let live = true;
    loadGroups().then(
      (value) => live && setGroups((old) => (old.state === "ready" && old.value === value ? old : { state: "ready", value })),
      () => live && setGroups({ state: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [tries]);

  // The emotes row takes the warm-up's answer as soon as the grid is in the page; without a warm-up it asks 7TV
  // the first time the panel opens. "Try again" always asks anew. Either way the answer is kept.
  const asked = useRef(-1);
  useEffect(() => {
    const warmed = tries === 0 ? warmedEmotes() : null;
    if ((!open && !warmed) || asked.current === tries) return;
    asked.current = tries;
    setEmotes({ state: "loading" });
    // Not dropped when the panel closes before 7TV answers: the grid stays in the page, so the answer still lands.
    (warmed ?? findEmotes("")).then(
      (value) => alive.current && setEmotes({ state: "ready", value }),
      () => alive.current && setEmotes({ state: "failed" }),
    );
  }, [open, tries]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Emoji search is local and instant; the emote search waits for a pause in typing.
  useEffect(() => {
    const words = query.trim();
    if (!words) {
      setFound(null);
      return;
    }
    let live = true;
    // A new search, or "Try again", shows "Loading emotes…" until 7TV answers.
    setFound((old) => (old?.query === words ? { ...old, emotes: { state: "loading" } } : old));
    void searchEmoji(words).then((emoji) => live && setFound((old) => ({ query: words, emoji, emotes: old?.query === words ? old.emotes : { state: "loading" } })));
    const wait = window.setTimeout(() => {
      findEmotes(words, 30).then(
        (value) => live && setFound((old) => (old && old.query === words ? { ...old, emotes: { state: "ready", value } } : old)),
        () => live && setFound((old) => (old && old.query === words ? { ...old, emotes: { state: "failed" } } : old)),
      );
    }, SEARCH_WAIT_MS);
    return () => {
      live = false;
      window.clearTimeout(wait);
    };
  }, [query, tries]);

  // Light the group whose heading is at or above the top of the grid.
  const track = () => {
    const box = scroller.current;
    if (!box || searching) return;
    const top = box.getBoundingClientRect().top + 8;
    let current = "recent";
    box.querySelectorAll<HTMLElement>("[data-section]").forEach((section) => {
      if (section.getBoundingClientRect().top <= top) current = section.dataset.section!;
    });
    setActive(current);
  };

  const jump = (section: string) => {
    setQuery("");
    requestAnimationFrame(() => {
      const target = scroller.current?.querySelector<HTMLElement>(`[data-section="${section}"]`);
      if (!target || !scroller.current) return;
      scroller.current.scrollTo({ top: target.offsetTop - scroller.current.offsetTop, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      setActive(section);
    });
  };

  const firstMatch = (): EmojiChoice | null => {
    if (found?.emoji[0]) return { kind: "emoji", char: found.emoji[0].char };
    if (found?.emotes.state === "ready" && found.emotes.value[0]) return { kind: "emote", emote: found.emotes.value[0] };
    return null;
  };

  return (
    <div className="eb">
      <label className="eb-search">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="i">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5 20 20" />
        </svg>
        <input
          type="search"
          value={query}
          placeholder={placeholder}
          aria-label={placeholder}
          enterKeyHint="search"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const choice = firstMatch();
              if (choice) onPick(choice);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              scroller.current?.querySelector<HTMLElement>(".eb-cell")?.focus();
            }
          }}
        />
      </label>
      <div className="eb-scroll" ref={scroller} onScroll={track} onKeyDown={(event) => moveInGrid(event, scroller.current)}>
        {searching ? (
          <>
            <Section id="found" title="Emoji">
              {found && found.emoji.length === 0 && <p className="eb-note">No emoji found</p>}
              <Cells items={(found?.emoji ?? []).map((emoji) => ({ choice: { kind: "emoji", char: emoji.char }, name: emoji.name }))} onPick={onPick} />
            </Section>
            <EmoteSection title="Emotes · 7TV" load={found?.emotes ?? { state: "loading" }} empty="No emotes found" onRetry={() => setTries(tries + 1)} onPick={onPick} />
          </>
        ) : (
          <>
            <Section id="recent" title="Frequently Used">
              <Cells items={recent.map((choice) => ({ choice, name: choice.kind === "emoji" ? choice.char : `:${choice.emote.name}:` }))} onPick={onPick} eager={recent.length} />
            </Section>
            <EmoteSection id="emotes" title="Emotes · 7TV" load={emotes} empty="No emotes" onRetry={() => setTries(tries + 1)} onPick={onPick} eager />
            {groups.state === "failed" && (
              <p className="eb-note">
                Emoji didn't load.{" "}
                <button type="button" className="eb-retry" onClick={() => setTries(tries + 1)}>
                  Try again
                </button>
              </p>
            )}
            {groups.state === "ready" && <AllGroups groups={groups.value} onPick={onPick} />}
            <p className="eb-credit">Emoji art: Twemoji, CC-BY 4.0</p>
          </>
        )}
      </div>
      <nav className="eb-tabs" aria-label="Emoji groups">
        <button type="button" className={active === "recent" && !searching ? "on" : ""} aria-label="Frequently Used" title="Frequently Used" onClick={() => jump("recent")}>
          <svg viewBox="0 0 24 24" width="20" height="20" className="i" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
        </button>
        <button type="button" className={`eb-7tv${active === "emotes" && !searching ? " on" : ""}`} aria-label="Emotes from 7TV" title="Emotes · 7TV" onClick={() => jump("emotes")}>
          7TV
        </button>
        {GROUPS.map((group) => (
          <button key={group.id} type="button" className={active === `g${group.id}` && !searching ? "on" : ""} aria-label={group.label} title={group.label} onClick={() => jump(`g${group.id}`)}>
            <Glyph choice={{ kind: "emoji", char: group.icon }} eager />
          </button>
        ))}
      </nav>
    </div>
  );
}

/** Every emoji by group: drawn once, and again only if the emoji list itself changes. */
const AllGroups = memo(function AllGroups({ groups, onPick }: { groups: Map<number, EmojiItem[]>; onPick: (choice: EmojiChoice) => void }) {
  return (
    <>
      {GROUPS.map((group, at) => (
        <Section key={group.id} id={`g${group.id}`} title={group.label} lazy>
          <Cells items={(groups.get(group.id) ?? []).map((emoji) => ({ choice: { kind: "emoji", char: emoji.char }, name: emoji.name }))} onPick={onPick} eager={at === 0 ? FIRST_SCREEN_CELLS : 0} />
        </Section>
      ))}
    </>
  );
});

/** A heading and its grid. Groups far below the fold skip layout until scrolled near (content-visibility). */
function Section({ id, title, lazy = false, children }: { id: string; title: string; lazy?: boolean; children: React.ReactNode }) {
  return (
    <section className={`eb-sec${lazy ? " lazy" : ""}`} data-section={id} aria-label={title}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

/** The emotes row: 7TV's answer, a loading line, or a short failure with "Try again". The grid's own row loads its pictures while out of sight (eager). */
function EmoteSection({ id, title, load, empty, onRetry, onPick, eager = false }: { id?: string; title: string; load: Load<Emote[]>; empty: string; onRetry: () => void; onPick: (choice: EmojiChoice) => void; eager?: boolean }) {
  return (
    <Section id={id ?? "found-emotes"} title={title}>
      {load.state === "loading" && <p className="eb-note">Loading emotes…</p>}
      {load.state === "failed" && (
        <p className="eb-note">
          Emotes didn't load.{" "}
          <button type="button" className="eb-retry" onClick={onRetry}>
            Try again
          </button>
        </p>
      )}
      {load.state === "ready" && load.value.length === 0 && <p className="eb-note">{empty}</p>}
      {load.state === "ready" && <Cells items={load.value.map((emote) => ({ choice: { kind: "emote", emote }, name: `:${emote.name}:` }))} onPick={onPick} eager={eager ? load.value.length : 0} />}
    </Section>
  );
}

/**
 * One grid of emoji buttons. The first `eager` pictures load while the panel
 * is still closed (the first screen, fetched ahead by the warm-up), so it
 * opens drawn; the rest load as they come near.
 * Inputs: the cells, what a pick does, how many load early (0 by default).
 * Output: the grid, or nothing for no cells.
 * Examples (checked in Chrome): Smileys with eager 80 → its first 80 pictures are complete before the panel first opens
 */
function Cells({ items, onPick, eager = 0 }: { items: { choice: EmojiChoice; name: string }[]; onPick: (choice: EmojiChoice) => void; eager?: number }) {
  if (items.length === 0) return null;
  return (
    <div className="eb-grid">
      {items.map(({ choice, name }, at) => (
        <button key={reactionKey(choice)} type="button" className="eb-cell" tabIndex={-1} aria-label={name} title={name} onClick={() => onPick(choice)}>
          <Glyph choice={choice} eager={at < eager} />
        </button>
      ))}
    </div>
  );
}

/**
 * Arrow keys in the grid: left and right step, up and down go to the
 * nearest cell in the row above or below, across headings too.
 * Inputs: the key event and the grid. Output: nothing; focus moves.
 * Examples (checked on screen): ↓ from the field → the first cell; ↓ again → the cell below it
 */
function moveInGrid(event: KeyboardEvent, box: HTMLElement | null) {
  if (!box || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  const cells = [...box.querySelectorAll<HTMLElement>(".eb-cell")];
  const at = cells.indexOf(document.activeElement as HTMLElement);
  if (at < 0) return;
  event.preventDefault();
  let next: HTMLElement | undefined;
  if (event.key === "ArrowLeft") next = cells[at - 1];
  else if (event.key === "ArrowRight") next = cells[at + 1];
  else {
    const here = cells[at].getBoundingClientRect();
    const down = event.key === "ArrowDown";
    const rows = cells.filter((cell) => {
      const box2 = cell.getBoundingClientRect();
      return down ? box2.top > here.bottom - 2 : box2.bottom < here.top + 2;
    });
    if (rows.length) {
      const rowTop = down ? Math.min(...rows.map((cell) => cell.getBoundingClientRect().top)) : Math.max(...rows.map((cell) => cell.getBoundingClientRect().top));
      const row = rows.filter((cell) => Math.abs(cell.getBoundingClientRect().top - rowTop) < 2);
      next = row.reduce((best, cell) => (Math.abs(cell.getBoundingClientRect().left - here.left) < Math.abs(best.getBoundingClientRect().left - here.left) ? cell : best));
    }
  }
  next?.focus();
  next?.scrollIntoView({ block: "nearest" });
}
