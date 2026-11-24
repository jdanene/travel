import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Icon } from "../../../components/Icon";
import type { WriteResult } from "../../../lib/db";
import type { KlipyItem } from "../lib/klipy";
import { MAX_OPTION, MAX_TEXT, readyDraft, type Draft } from "../lib/lines";
import { withEmoteTokens, type EmojiChoice } from "../lib/reactions";
import { MessagePicker } from "./Pickers";

interface ComposerProps {
  /** The field's placeholder and name: "Message" in the list, "Reply" under a post. */
  placeholder: string;
  /** The reply bar: smaller, and with no "+" (a reply is never a poll). */
  small?: boolean;
  /** Focus the field when the bar appears (a reply bar opened by a tap). */
  autoFocus?: boolean;
  /** Sends the draft. The bar clears before this settles; a failure brings the words back with the reason. */
  onSend: (draft: Draft) => Promise<WriteResult>;
  /** Posts a GIF or sticker from the emoji panel; absent in a reply bar. */
  onGif?: (item: KlipyItem) => Promise<WriteResult>;
  /** Keeps an unsent reply when its thread folds: the words come back when it opens again. */
  draftKey?: string;
}

/** Unsent replies, by post, for the page's life: folding a thread never throws words away. */
const drafts = new Map<string, string>();

/** How many option fields a new poll starts with (the mock's Option 1, 2 and 3 (optional)). */
const FIRST_OPTIONS = 3;

/**
 * The message bar, as on Discord: one floating rounded bar, slightly
 * lighter than the page, holding a plain "+", the field ("Message"), a
 * round emoji button, and the send arrow, which appears only once there is
 * something to send. "+" opens the extras; the one extra is Poll, which
 * turns the message into a question with 2 to 4 options shown above the
 * bar. The emoji button opens the Emoji | GIFs | Stickers panel: an emoji
 * goes in at the cursor (an emote shows as ":name:" and is stored as
 * Discord's <:name:id>), a GIF or sticker posts at once.
 *
 * Sending clears the bar at once and keeps the keyboard up; the line shows
 * in the list straight away (the caller marks it "Sending…"). A failed send
 * brings the words back, if the field is still empty, and says why under
 * the bar. On a phone Return adds a line; with a mouse and keyboard, Enter
 * sends and Shift+Enter adds a line. The field keeps 16 px text, so iOS
 * does not zoom, and it scrolls itself above the keyboard as it opens.
 * The reply bar is the same bar, smaller, with no "+" and no GIFs, and it
 * keeps its words if its thread folds.
 *
 * Inputs: placeholder, small, autoFocus, onSend, onGif and draftKey, as above.
 * Output: the bar.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   type "Hi" → the send arrow scales in; Enter on a laptop → the bar clears, the line lands at the foot of the feed
 *   "+", then "Poll" → three option fields slide in above the bar; the field reads "Ask a question"
 *   😀, then 🔥 → "🔥" at the cursor; the panel stays for more
 *   emulator stopped mid-send → the line waits as "Sending…"; a refused send → the words come back with the reason
 */
export function Composer({ placeholder, small = false, autoFocus = false, onSend, onGif, draftKey }: ComposerProps) {
  const [text, setTextState] = useState(() => (draftKey ? drafts.get(draftKey) ?? "" : ""));
  const setText = (next: string) => {
    setTextState(next);
    if (draftKey) drafts.set(draftKey, next);
  };
  const [picking, setPicking] = useState(false);
  const emojiButton = useRef<HTMLButtonElement>(null);
  // The emotes picked into this message, name to id, so ":name:" is stored as <:name:id> (reactions.ts).
  const emotes = useRef<Record<string, string>>({});
  // Where the cursor was when the field lost focus to the emoji panel.
  const caret = useRef<[number, number] | null>(null);
  const [options, setOptions] = useState<string[] | null>(null);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const draft = readyDraft({ text: withEmoteTokens(text, emotes.current), options: options ?? undefined });
  useAboveKeyboard(form, field);

  useEffect(() => {
    if (autoFocus) field.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  // The menu shuts on Escape and on a tap anywhere else.
  useEffect(() => {
    if (!menu) return;
    const shut = (event: Event) => {
      const outside = !form.current?.querySelector(".msg-plus-wrap")?.contains(event.target as Node);
      if (event.type === "keydown" ? (event as globalThis.KeyboardEvent).key === "Escape" : outside) setMenu(false);
    };
    document.addEventListener("pointerdown", shut);
    document.addEventListener("keydown", shut);
    return () => {
      document.removeEventListener("pointerdown", shut);
      document.removeEventListener("keydown", shut);
    };
  }, [menu]);

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    if (!draft) return;
    const kept = { text, options, emotes: emotes.current };
    setText("");
    emotes.current = {};
    setOptions(null);
    setMenu(false);
    setError(null);
    void onSend(draft).then((result) => {
      if (result.ok) return;
      // Bring the words back only into an empty bar, so nothing typed since is lost.
      if (field.current && field.current.value === "") {
        setText(kept.text);
        emotes.current = kept.emotes;
        setOptions(kept.options);
      }
      setError(result.reason === "refused" ? "Not sent: only friends on the trip can post." : "Not sent: no connection. Try again.");
    });
  };

  // Puts an emoji (or an emote's ":name:") in at the cursor, and keeps the cursor after it.
  const insert = (choice: EmojiChoice) => {
    const input = field.current;
    const [start, end] = caret.current ?? [text.length, text.length];
    let piece: string;
    if (choice.kind === "emote") {
      emotes.current[choice.emote.name] = choice.emote.id;
      piece = `:${choice.emote.name}:`;
      if (start > 0 && !/\s$/.test(text.slice(0, start))) piece = ` ${piece}`;
      piece += " ";
    } else piece = [...choice.char].length === 1 && choice.char.codePointAt(0)! < 0x1f000 ? `${choice.char}\ufe0f` : choice.char;
    if (text.length - (end - start) + piece.length > MAX_TEXT) return;
    const next = text.slice(0, start) + piece + text.slice(end);
    setText(next);
    if (error) setError(null);
    caret.current = [start + piece.length, start + piece.length];
    requestAnimationFrame(() => input?.setSelectionRange(start + piece.length, start + piece.length));
  };

  // Back to the field, the cursor where the last emoji went in. At once, inside the tap: iOS raises the keyboard
  // only for a focus made during the tap itself, never for one in a later frame.
  const backToField = () => {
    field.current?.focus({ preventScroll: true });
    if (caret.current) field.current?.setSelectionRange(caret.current[0], caret.current[1]);
  };

  const sendGif = (item: KlipyItem) => {
    setPicking(false);
    setError(null);
    void onGif?.({ ...item }).then((result) => {
      if (!result.ok) setError(result.reason === "refused" ? "Not sent: only friends on the trip can post." : "Not sent: no connection. Try again.");
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    // A phone's Return adds a line; a desk keyboard's Enter sends.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    event.preventDefault();
    send();
  };

  const startPoll = () => {
    setOptions(Array(FIRST_OPTIONS).fill(""));
    setMenu(false);
    field.current?.focus({ preventScroll: true });
  };

  // Taps on the round buttons keep the field focused, so the keyboard stays up as on an iPhone.
  const keepFocus = { onPointerDown: (event: { preventDefault: () => void }) => event.preventDefault(), onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault() };

  return (
    <form ref={form} className={`msg${small ? " small" : ""}`} onSubmit={send}>
      {!small && (
        <div className={`msg-poll${options ? " open" : ""}`} aria-hidden={!options}>
          <div className="msg-poll-in">
            {options && (
              <div className="msg-poll-box" role="group" aria-labelledby="msg-poll-title">
                <p className="msg-poll-head">
                  <Icon name="poll" size={16} />
                  <b id="msg-poll-title">Poll</b>
                  <span>2 to 4 options. Everyone sees the votes and who voted.</span>
                </p>
                <button type="button" className="msg-poll-off" aria-label="Make it a message" onClick={() => setOptions(null)}>
                  <Icon name="close" size={18} />
                </button>
                {options.map((option, index) => (
                  <input
                    key={index}
                    className="msg-opt"
                    aria-label={`Option ${index + 1}`}
                    placeholder={index < 2 ? `Option ${index + 1}` : `Option ${index + 1} (optional)`}
                    maxLength={MAX_OPTION}
                    value={option}
                    onChange={(event) => setOptions(options.map((old, at) => (at === index ? event.target.value : old)))}
                  />
                ))}
                {options.length < 4 && (
                  <button type="button" className="msg-addo" onClick={() => setOptions([...options, ""])}>
                    Add option
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <div className={`msg-bar${draft ? " ready" : ""}`}>
        {!small && (
          <div className="msg-plus-wrap">
            <button
              type="button"
              className={`msg-icon msg-plus${menu ? " open" : ""}`}
              aria-label={menu ? "Close" : "More"}
              aria-expanded={menu}
              aria-haspopup="menu"
              onClick={() => setMenu(!menu)}
              {...keepFocus}
            >
              <Icon name="plus" size={22} />
            </button>
            <div className={`msg-menu${menu ? " open" : ""}`} role="menu" aria-hidden={!menu}>
              <button type="button" role="menuitem" tabIndex={menu ? 0 : -1} onClick={startPoll} disabled={options !== null} {...keepFocus}>
                <Icon name="poll" size={18} />
                Poll
              </button>
            </div>
          </div>
        )}
        <label className="msg-field" data-value={text}>
          <textarea
            ref={field}
            rows={1}
            value={text}
            maxLength={MAX_TEXT}
            placeholder={options ? "Ask a question" : placeholder}
            aria-label={options ? "Question" : placeholder}
            enterKeyHint={window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ? "send" : "enter"}
            onChange={(event) => {
              setText(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={onKeyDown}
            onBlur={(event) => {
              caret.current = [event.target.selectionStart, event.target.selectionEnd];
            }}
          />
        </label>
        <button
          ref={emojiButton}
          type="button"
          className={`msg-icon msg-emoji${picking ? " open" : ""}`}
          aria-label={picking ? "Show keyboard" : onGif ? "Emoji and GIFs" : "Emoji"}
          aria-haspopup="dialog"
          aria-expanded={picking}
          onClick={() => {
            if (picking) {
              // As on Discord, the button turned keyboard: the panel goes and the keyboard comes back.
              setPicking(false);
              backToField();
              return;
            }
            if (document.activeElement === field.current) caret.current = [field.current!.selectionStart, field.current!.selectionEnd];
            setPicking(true);
          }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" className="i smile" aria-hidden="true">
            <circle cx="12" cy="12" r="8.75" />
            <path d="M8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2" />
            <circle cx="9.25" cy="9.75" r="0.6" fill="currentColor" />
            <circle cx="14.75" cy="9.75" r="0.6" fill="currentColor" />
          </svg>
          <svg viewBox="0 0 24 24" width="22" height="22" className="i kb" aria-hidden="true">
            <rect x="2.75" y="6" width="18.5" height="12" rx="2.5" />
            <path d="M6.5 9.5h.01M10 9.5h.01M13.5 9.5h.01M17 9.5h.01M6.5 12.5h.01M10 12.5h.01M13.5 12.5h.01M17 12.5h.01M8.5 15.25h7" />
          </svg>
        </button>
        <button type="submit" className="msg-send" aria-label={options ? "Post poll" : "Send"} disabled={!draft} aria-hidden={!draft} tabIndex={draft ? 0 : -1} {...keepFocus}>
          <Icon name="up" size={18} />
        </button>
      </div>
      <MessagePicker
        open={picking}
        anchor={emojiButton}
        onClose={() => {
          setPicking(false);
          // On a desktop focus goes back to the field; on a phone a tap elsewhere must not raise the keyboard.
          if (window.matchMedia("(min-width: 900px) and (hover: hover)").matches) backToField();
        }}
        onEmoji={insert}
        onGif={onGif ? sendGif : undefined}
        keep={!small}
      />
      {error && (
        <p className="msg-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

/**
 * Keeps the whole message bar, poll fields and all, in sight above the
 * on-screen keyboard. Safari's keyboard shrinks only the visible part of the
 * page (visualViewport), never the layout, so nothing here is fixed to the
 * bottom: while a field in the bar has focus, the page's foot is padded by
 * the keyboard's height (so the page can always move up far enough) and the
 * page scrolls, at once, so the bar's foot sits 12 px above the keyboard; if
 * the bar is taller than what is visible, the focused field wins. It runs on
 * focus, on every visualViewport resize or scroll, and whenever the bar
 * grows (Poll opening, a fourth option, a longer message).
 * Inputs: the bar and its field. Output: nothing; sets --kb-pad on <html> while typing.
 * Examples (checked in emulation at 375 px with the visible height cut as a keyboard would; a real iPhone is unverified):
 *   focus "Message"                → the bar's foot 12 px above the keyboard
 *   "+", then Poll, keyboard up    → the poll's question, options and bar all sit above the keyboard
 */
function useAboveKeyboard(bar: React.RefObject<HTMLElement>, field: React.RefObject<HTMLTextAreaElement>) {
  useEffect(() => {
    const view = window.visualViewport;
    const box = bar.current;
    if (!view || !box || !field.current) return;
    const root = document.documentElement;
    const fit = () => {
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || !box.contains(focused)) return;
      const covered = Math.max(0, window.innerHeight - (view.offsetTop + view.height));
      root.style.setProperty("--kb-pad", `${Math.round(covered)}px`);
      root.classList.toggle("kb-open", covered > 0);
      const top = view.offsetTop + 8;
      const bottom = view.offsetTop + view.height - 12;
      const rect = box.getBoundingClientRect();
      let move = 0;
      if (rect.height <= bottom - top) {
        if (rect.bottom > bottom) move = rect.bottom - bottom;
        else if (rect.top < top) move = rect.top - top;
      } else {
        // Taller than what is visible: keep the focused field in sight.
        const own = focused.getBoundingClientRect();
        if (own.bottom > bottom) move = own.bottom - bottom;
        else if (own.top < top) move = own.top - top;
      }
      if (Math.abs(move) > 1) window.scrollBy({ top: move, behavior: "instant" as ScrollBehavior });
    };
    const leave = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && box.contains(event.relatedTarget)) return;
      root.classList.remove("kb-open");
    };
    const grow = new ResizeObserver(() => fit());
    grow.observe(box);
    view.addEventListener("resize", fit);
    view.addEventListener("scroll", fit);
    box.addEventListener("focusin", fit);
    box.addEventListener("focusout", leave);
    return () => {
      grow.disconnect();
      view.removeEventListener("resize", fit);
      view.removeEventListener("scroll", fit);
      box.removeEventListener("focusin", fit);
      box.removeEventListener("focusout", leave);
    };
  }, [bar, field]);
}
