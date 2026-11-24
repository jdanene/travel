import { useState, type RefObject } from "react";
import { rememberChoice } from "../lib/emoji";
import { klipyOn, type KlipyItem } from "../lib/klipy";
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
  /** Posts a GIF or sticker as its own message; absent in a reply bar (a reply is words). */
  onGif?: (item: KlipyItem) => void;
  /** Render it while the page is idle and keep it, so it opens with no work but the slide (the main message bar). */
  keep?: boolean;
}

/**
 * The message bar's emoji panel: Discord's "Emoji | GIFs | Stickers"
 * switch over the emoji grid or KLIPY's grid. With no KLIPY key in the
 * build, or in a reply bar, there is no switch: only Emoji. On a phone it
 * docks where the keyboard would be, under the bar (Drawer, dock).
 *
 * Inputs: open, onClose, the emoji button, and what an emoji or a GIF does.
 * Output: the panel.
 * Examples (checked on screen):
 *   tap 😀 in the bar, tap 🔥 → "🔥" goes in at the cursor; the panel stays
 *   GIFs, tap a GIF          → it posts to the feed; the panel closes
 */
export function MessagePicker({ open, onClose, anchor, onEmoji, onGif, keep = false }: MessagePickerProps) {
  const tabs: Tab[] = klipyOn && onGif ? ["emoji", "gifs", "stickers"] : ["emoji"];
  const [tab, setTab] = useState<Tab>(tabs.includes(lastTab) ? lastTab : "emoji");
  const choose = (next: Tab) => {
    lastTab = next;
    setTab(next);
  };
  return (
    <Drawer open={open} label={tab === "emoji" ? "Emoji" : tab === "gifs" ? "GIFs" : "Stickers"} onClose={onClose} anchor={anchor} focusOnDesk="input[type=search]" dock keep={keep}>
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
