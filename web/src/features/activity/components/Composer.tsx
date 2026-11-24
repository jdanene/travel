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
          aria-label={onGif ? "Emoji and GIFs" : "Emoji"}
          aria-haspopup="dialog"
          aria-expanded={picking}
          onClick={() => {
            if (document.activeElement === field.current) caret.current = [field.current!.selectionStart, field.current!.selectionEnd];
            setPicking(true);
          }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" className="i" aria-hidden="true">
            <circle cx="12" cy="12" r="8.75" />
            <path d="M8.5 14c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2" />
            <circle cx="9.25" cy="9.75" r="0.6" fill="currentColor" />
            <circle cx="14.75" cy="9.75" r="0.6" fill="currentColor" />
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
          // Back to the field, the cursor where the last emoji went in.
          requestAnimationFrame(() => {
            field.current?.focus({ preventScroll: true });
            if (caret.current) field.current?.setSelectionRange(caret.current[0], caret.current[1]);
          });
        }}
        onEmoji={insert}
        onGif={onGif ? sendGif : undefined}
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
 * Keeps the bar in sight above the on-screen keyboard: when the field takes
 * focus, and each time the visible part of the page (visualViewport)
 * changes while it has focus, the page scrolls just enough to show the
 * whole bar, at once, so it does not bounce.
 * Inputs: the bar and its field. Output: nothing.
 * Examples (checked at 375 px with the viewport shortened as a keyboard would): focus the field → the bar's foot sits 12 px above the keyboard
 */
function useAboveKeyboard(bar: React.RefObject<HTMLElement>, field: React.RefObject<HTMLTextAreaElement>) {
  useEffect(() => {
    const view = window.visualViewport;
    const input = field.current;
    if (!view || !input) return;
    const fit = () => {
      if (document.activeElement !== input || !bar.current) return;
      const box = bar.current.getBoundingClientRect();
      const bottom = view.offsetTop + view.height;
      if (box.bottom > bottom - 12) window.scrollBy({ top: box.bottom - bottom + 12, behavior: "instant" as ScrollBehavior });
      else if (box.top < view.offsetTop) window.scrollBy({ top: box.top - view.offsetTop - 12, behavior: "instant" as ScrollBehavior });
    };
    view.addEventListener("resize", fit);
    input.addEventListener("focus", fit);
    return () => {
      view.removeEventListener("resize", fit);
      input.removeEventListener("focus", fit);
    };
  }, [bar, field]);
}
