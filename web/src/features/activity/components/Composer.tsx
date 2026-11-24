import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Icon } from "../../../components/Icon";
import type { WriteResult } from "../../../lib/db";
import { MAX_OPTION, MAX_TEXT, readyDraft, type Draft } from "../lib/lines";

interface ComposerProps {
  /** The field's placeholder and name: "Message" in the list, "Reply" under a post. */
  placeholder: string;
  /** The reply bar: smaller, and with no "+" (a reply is never a poll). */
  small?: boolean;
  /** Focus the field when the bar appears (a reply bar opened by a tap). */
  autoFocus?: boolean;
  /** Sends the draft. The bar clears before this settles; a failure brings the words back with the reason. */
  onSend: (draft: Draft) => Promise<WriteResult>;
}

/** How many option fields a new poll starts with (the mock's Option 1, 2 and 3 (optional)). */
const FIRST_OPTIONS = 3;

/**
 * The message bar, as on an iPhone (owner, 24 Nov 2026: "use the message
 * box from iPhone"): a round "+" on the left, a rounded field that grows
 * with the text up to four lines, and a round send button with an up arrow
 * that fills in once there is something to send. "+" opens the extras;
 * the one extra is Poll, which turns the message into a question with 2 to
 * 4 options, shown above the field. A message is the default; a poll is
 * the special case.
 *
 * Sending clears the bar at once and keeps the keyboard up; the line shows
 * in the list straight away (the caller marks it "Sending…"). A failed send
 * brings the words back, if the field is still empty, and says why under
 * the bar. On a phone Return adds a line; with a mouse and keyboard, Enter
 * sends and Shift+Enter adds a line. The field keeps 16 px text, so iOS
 * does not zoom, and it scrolls itself above the keyboard as it opens.
 *
 * Inputs: placeholder, small, autoFocus and onSend, as above.
 * Output: the bar.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   type "Hi" → the send button fades and scales in; Enter on a laptop → the bar clears, "RB posted · Sending…" tops the list
 *   "+", then "Poll" → three option fields slide in above the field; the field reads "Ask a question"; focus stays in it
 *   emulator stopped mid-send → the line waits as "Sending…"; a refused send → the words come back with the reason
 */
export function Composer({ placeholder, small = false, autoFocus = false, onSend }: ComposerProps) {
  const [text, setText] = useState("");
  const [options, setOptions] = useState<string[] | null>(null);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const draft = readyDraft({ text, options: options ?? undefined });
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
    const kept = { text, options };
    setText("");
    setOptions(null);
    setMenu(false);
    setError(null);
    void onSend(draft).then((result) => {
      if (result.ok) return;
      // Bring the words back only into an empty bar, so nothing typed since is lost.
      if (field.current && field.current.value === "") {
        setText(kept.text);
        setOptions(kept.options);
      }
      setError(result.reason === "refused" ? "Not sent: only friends on the trip can post." : "Not sent: no connection. Try again.");
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
      <div className="msg-bar">
        {!small && (
          <div className="msg-plus-wrap">
            <button
              type="button"
              className={`msg-round msg-plus${menu ? " open" : ""}`}
              aria-label={menu ? "Close" : "More"}
              aria-expanded={menu}
              aria-haspopup="menu"
              onClick={() => setMenu(!menu)}
              {...keepFocus}
            >
              <Icon name="plus" size={20} />
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
          />
        </label>
        <button type="submit" className={`msg-round msg-send${draft ? " ready" : ""}`} aria-label={options ? "Post poll" : "Send"} disabled={!draft} {...keepFocus}>
          <Icon name="up" size={18} />
        </button>
      </div>
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
