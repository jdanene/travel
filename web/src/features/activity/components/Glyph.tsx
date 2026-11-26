import { parse } from "@twemoji/parser";
import { Fragment, useState } from "react";
import { emoteUrl, twemojiUrl } from "../lib/emoji";
import { readMessage } from "../lib/players";
import { splitEmotes, type EmojiChoice } from "../lib/reactions";

/**
 * One emoji as Discord draws it: Twemoji's picture for a standard emoji,
 * 7TV's for an emote. A picture that fails to load gives way to the
 * phone's own emoji (or ":name:" for an emote), so nothing goes blank.
 *
 * Inputs: choice — what to draw; label — the screen reader's words
 * (omit inside a labelled button, where the picture is decoration).
 * Output: an <img>, or the text fallback.
 * Examples (checked on screen): 🔥 → Twemoji's flame at the text's size; an emote → its 7TV picture
 */
export function Glyph({ choice, label }: { choice: EmojiChoice; label?: string }) {
  const [broken, setBroken] = useState(false);
  const text = choice.kind === "emoji" ? choice.char : `:${choice.emote.name}:`;
  if (broken) return <span className="glyph-text">{text}</span>;
  return (
    <img
      className={`glyph${choice.kind === "emote" ? " emote" : ""}`}
      src={choice.kind === "emoji" ? twemojiUrl(choice.char) : emoteUrl(choice.emote.id)}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
    />
  );
}

/** At most this many emoji and nothing else make a message "jumbo", as on Discord. */
const JUMBO = 27;

/**
 * A message's text with every emoji and emote drawn as a picture, so it
 * reads the same on every phone. A message of emoji alone is drawn large.
 * An Instagram or TikTok address is a short link that opens the site in a
 * new tab (exception 36); other addresses stay plain text.
 *
 * Inputs: the stored text. Output: the text, as inline pieces.
 * Examples (checked on screen):
 *   "see you there 🔥"                         → the words, then Twemoji's flame at the text's size
 *   "🔥🔥" or "<:catJAM:01FCY771D800007PQ2DF3GDTN6>" → large pictures
 *   "so good 🔥 https://www.tiktok.com/@club/video/7391831906586807598" → the words, the flame, then "tiktok.com/@club/video/73918319…" as a link; not large
 */
export function RichText({ text, className }: { text: string; className: string }) {
  const pieces: DrawnPiece[] = [];
  readMessage(text).pieces.forEach((part, index) => {
    if (part.kind === "link") {
      pieces.push({
        key: `l${index}`,
        node: (
          <a className="msg-link" href={part.href} target="_blank" rel="noopener noreferrer">
            {part.label}
          </a>
        ),
        glyph: false,
        blank: false,
      });
      return;
    }
    emojiPieces(part.text, `${index}`, pieces);
  });
  const glyphs = pieces.filter((piece) => piece.glyph).length;
  const jumbo = glyphs > 0 && glyphs <= JUMBO && pieces.every((piece) => piece.glyph || piece.blank);
  return (
    <p className={`${className}${jumbo ? " jumbo" : ""}`}>
      {pieces.map((piece) => (
        <Fragment key={piece.key}>{piece.node}</Fragment>
      ))}
    </p>
  );
}

type DrawnPiece = { key: string; node: React.ReactNode; glyph: boolean; blank: boolean };

/**
 * Splits plain words into text, emoji and emote pieces for RichText.
 * Inputs: the words; a key prefix unique in the message; the list to add to.
 * Output: nothing; the pieces are pushed in order.
 * Examples (checked on screen through RichText): "hi 🔥" → "hi ", then the flame
 */
function emojiPieces(text: string, prefix: string, pieces: DrawnPiece[]) {
  splitEmotes(text).forEach((piece, at) => {
    if (piece.kind === "emote") {
      pieces.push({ key: `e${prefix}-${at}`, node: <Glyph choice={{ kind: "emote", emote: piece.emote }} label={`:${piece.emote.name}:`} />, glyph: true, blank: false });
      return;
    }
    let from = 0;
    for (const found of parse(piece.text, { buildUrl: () => "" })) {
      const [start, end] = found.indices;
      if (start > from) pieces.push({ key: `t${prefix}-${at}-${from}`, node: piece.text.slice(from, start), glyph: false, blank: !piece.text.slice(from, start).trim() });
      pieces.push({ key: `g${prefix}-${at}-${start}`, node: <Glyph choice={{ kind: "emoji", char: found.text }} label={found.text} />, glyph: true, blank: false });
      from = end;
    }
    if (from < piece.text.length) pieces.push({ key: `t${prefix}-${at}-${from}`, node: piece.text.slice(from), glyph: false, blank: !piece.text.slice(from).trim() });
  });
}
