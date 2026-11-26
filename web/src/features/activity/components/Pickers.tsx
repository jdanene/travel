import { useLayoutEffect, useState, type RefObject } from "react";
import { rememberChoice } from "../lib/emoji";
import { klipyOn, type KlipyItem } from "../lib/klipy";
import { warmEmojiPanel } from "../lib/warm";
import type { EmojiChoice } from "../lib/reactions";
import { Drawer } from "./Drawer";
import { EmojiBrowser } from "./EmojiBrowser";
import { GifBrowser } from "./GifBrowser";

type Tab = "emoji" | "gifs" | "stickers";
/** The tab the message bar's panel opened on last, for this page's life (Discord remembers it too). */
let lastTab: Tab = "emoji";

interface MessagePickerProps {
  open: boolean;
  onClose: () => void;
  anchor: RefObject<HTMLElement>;
  /** Puts an emoji or emote into the message at the cursor; the panel stays open for more. */
  onEmoji: (choice: EmojiChoice) => void;
  /** Sends a GIF or sticker (a message, or a reply in reply mode). */
  onGif?: (item: KlipyItem) => void;
}

/**
 * The message bar's emoji panel: Discord's "Emoji | GIFs | Stickers"
 * switch over the emoji grid or KLIPY's grid. With no KLIPY key in the
 * build there is no switch: only Emoji. It renders while the page is idle
 * and stays, so it opens with no work but the slide. On a phone it
 * docks where the keyboard would be, under the bar (Drawer, dock).
 *
 * Inputs: open, onClose, the emoji button, and what an emoji or a GIF does.
 * Output: the panel.
 * Examples (checked on screen):
 *   tap 😀 in the bar, tap 🔥 → "🔥" goes in at the cursor; the panel stays
 *   GIFs, tap a GIF          → it posts to the feed; the panel closes
 */
export function MessagePicker({ open, onClose, anchor, onEmoji, onGif }: MessagePickerProps) {
  useWarmUp();
  const tabs: Tab[] = klipyOn && onGif ? ["emoji", "gifs", "stickers"] : ["emoji"];
  const [tab, setTab] = useState<Tab>(tabs.includes(lastTab) ? lastTab : "emoji");
  const choose = (next: Tab) => {
    lastTab = next;
    setTab(next);
  };
  return (
    <Drawer open={open} label={tab === "emoji" ? "Emoji" : tab === "gifs" ? "GIFs" : "Stickers"} onClose={onClose} anchor={anchor} focusOnDesk="input[type=search]" dock keep>
      {tabs.length > 1 && (
        <div className="seg" role="tablist" aria-label="Emoji, GIFs or stickers">
          {tabs.map((name) => (
            <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => choose(name)}>
              {name === "emoji" ? "Emoji" : name === "gifs" ? "GIFs" : "Stickers"}
            </button>
          ))}
        </div>
      )}
      {tab === "emoji" ? (
        <EmojiBrowser
          active={open}
          placeholder="Find the perfect emoji"
          onPick={(choice) => {
            rememberChoice(choice);
            onEmoji(choice);
          }}
        />
      ) : (
        <GifBrowser key={tab} kind={tab} onPick={(item) => onGif?.(item)} />
      )}
    </Drawer>
  );
}

/**
 * Discord's reaction modal: "Find the perfect reaction", "Frequently
 * Used", the emotes and every emoji. A pick reacts and closes it.
 *
 * Inputs: open, onClose, the button that opened it, and what a pick does.
 * Output: the panel.
 * Examples (checked on screen): search "fire", tap 🔥 → "🔥 1" under the line, the panel closes
 */
export function ReactionPicker({ open, onClose, anchor, onPick }: { open: boolean; onClose: () => void; anchor: RefObject<HTMLElement>; onPick: (choice: EmojiChoice) => void }) {
  useWarmUp();
  return (
    <Drawer open={open} label="Add a reaction" onClose={onClose} anchor={anchor} focusOnDesk="input[type=search]" keep>
      <EmojiBrowser
        active={open}
        placeholder="Find the perfect reaction"
        onPick={(choice) => {
          rememberChoice(choice);
          onPick(choice);
        }}
      />
    </Drawer>
  );
}

/**
 * Runs the emoji warm-up (lib/warm.ts) at the trip page's first idle
 * moment, at most a second after its first paint, for a friend who came
 * straight to the trip; after the splash it finds the work done. It runs
 * once per page however many pickers ask.
 * Inputs: none. Output: nothing.
 * Examples (checked in Chrome): /trip/<id> opened directly → the first-screen pictures arrive about a second after the page draws
 */
function useWarmUp(): void {
  // A layout effect, so this idle task is queued before the kept panels' own (passive effects run later), and the
  // panels find 7TV's row already asked for when they render.
  useLayoutEffect(() => {
    const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => void warmEmojiPanel(), { timeout: 1000 });
    return () => cancel(id);
  }, []);
}
