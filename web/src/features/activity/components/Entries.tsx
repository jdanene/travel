import { useEffect, useRef, useState, type ReactNode } from "react";
import { Face, type Person } from "../../../components/Avatars";
import { Icon } from "../../../components/Icon";
import type { WriteResult } from "../../../lib/db";
import type { ActivityEntry, ActivityReply, MemberId } from "../../../types/trip";
import { lineWords, tally, whenLabels } from "../lib/lines";
import { Composer } from "./Composer";
import { RichText } from "./Glyph";

/** What every entry needs to draw its people and its time. */
export interface Viewer {
  memberId: MemberId;
  isOrganizer: boolean;
  /** Member id to name; an unknown id draws as itself. */
  names: Record<MemberId, string>;
  /** How many friends replied, for "5 of 8 voted". */
  crewSize: number;
  now: number;
}

const person = (viewer: Viewer, id: MemberId): Person => ({ id, name: viewer.names[id] ?? id });
const faceClass = (viewer: Viewer, id: MemberId) => (id === viewer.memberId ? "you" : "");

/** A member's circle: their photo, else their initials, in their own colour. */
function Who({ viewer, id }: { viewer: Viewer; id: MemberId | undefined }) {
  if (!id)
    return (
      <span className="av sys" aria-hidden="true">
        <Icon name="spark" size={16} />
      </span>
    );
  return <Face person={person(viewer, id)} className={faceClass(viewer, id)} />;
}

/** The name and the time on one line, as Discord's message header. */
function Head({ name, at, viewer, sending = false, children }: { name: string; at: number; viewer: Viewer; sending?: boolean; children?: ReactNode }) {
  return (
    <div className="row-head">
      <b>{name}</b>
      {sending ? <span className="row-time">Sending…</span> : <time className="row-time" dateTime={new Date(at).toISOString()}>{whenLabels(at, viewer.now).time}</time>}
      {children}
    </div>
  );
}

/** The author's quiet "…": shown on hover with a mouse, dim on a touch screen. */
function MoreButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button type="button" className={`fp-more ${className}`} aria-label="More for this line" title="More" onClick={onClick}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="6" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="18" cy="12" r="1.5" fill="currentColor" />
      </svg>
    </button>
  );
}

/** The one question before a line goes for everyone; note says what stays (an automatic line's thing is not undone). */
function DeleteAsk({ onDelete, onKeep, note }: { onDelete: () => void; onKeep: () => void; note?: string }) {
  return (
    <div className="fp-ask" role="group" aria-label="Delete for everyone?">
      <span>
        Delete for everyone?{note && <small> {note}</small>}
      </span>
      <button type="button" className="fp-yes" onClick={onDelete}>
        Delete
      </button>
      <button type="button" onClick={onKeep}>
        Keep
      </button>
    </div>
  );
}

/**
 * One automatic line, in the same shape as a message: the face, the name
 * with the time beside it, and what happened under it ("added a place:
 * Cliffside villa"), with the thing's small picture on the right when it
 * has one. A line about a module is a button that opens it. The reactions
 * row comes under, in the same text column. Its author (only the author)
 * gets the quiet "…" that asks "Delete for everyone?"; deleting takes the
 * line and its emoji off the Feed and leaves the thing itself (owner,
 * 24 Nov 2026: "only their updates").
 *
 * Inputs: the entry, the viewer, its thumbnail (or undefined), what a tap
 * does (or undefined), the reactions row, and what deleting does (absent when this member may not).
 * Output: the row.
 * Examples (checked on screen):
 *   KA's stay line → "KA  2 h ago", "added a place: Cliffside villa" under it, the villa's photo; a tap opens Stay
 *   your own "joined", "…" then "Delete" → the line goes on every phone; the trip still has you
 */
export function LineRow({ entry, viewer, thumb, onOpen, footer, onDelete }: { entry: ActivityEntry; viewer: Viewer; thumb?: string; onOpen?: () => void; footer: ReactNode; onDelete?: () => void }) {
  const [asking, setAsking] = useState(false);
  const block = useRef<HTMLDivElement>(null);
  useFoldOutside(asking, block, () => setAsking(false));
  const { lead, rest } = lineWords(entry, entry.by ? person(viewer, entry.by).name : "");
  const main = (
    <>
      <span className="row-text">
        <Head name={lead.replace(/:$/, "")} at={entry.at} viewer={viewer} />
        <span className="row-auto">{rest}</span>
      </span>
      {thumb && <span className="th" style={{ backgroundImage: `url("${thumb}")` }} aria-hidden="true" />}
    </>
  );
  const mainClass = `row-main${onDelete ? " with-more" : ""}`;
  return (
    <div className="row" ref={block}>
      <Who viewer={viewer} id={entry.by} />
      <div className="row-body">
        {onOpen ? (
          <button type="button" className={mainClass} onClick={onOpen}>
            {main}
          </button>
        ) : (
          <div className={mainClass}>{main}</div>
        )}
        {onDelete && !asking && <MoreButton className="corner" onClick={() => setAsking(true)} />}
        {asking && onDelete && <DeleteAsk note="Only this line goes." onDelete={onDelete} onKeep={() => setAsking(false)} />}
        {footer}
      </div>
    </div>
  );
}

interface WrittenProps {
  id: string;
  entry: ActivityEntry;
  viewer: Viewer;
  votes: Record<MemberId, number> | undefined;
  replies: Record<string, ActivityReply> | undefined;
  /** True while this device's post waits for the server. */
  sending: boolean;
  onVote: (index: number) => void;
  onReply: (text: string) => Promise<WriteResult>;
  onDelete: () => void;
  /** The reactions row; it takes the "Reply" control on its own line. */
  reactions: (after: ReactNode) => ReactNode;
}

/**
 * A friend's message or poll, as on Discord: the face, the name with the
 * time beside it, and the words under it as plain text (no box, so only
 * the message bar looks like a field). A GIF shows as a rounded picture
 * that keeps its shape while it loads. A poll keeps a quiet box in the
 * card's thin grey, with a bar for each share, the voters' faces and the
 * count; a tap votes or changes the vote. Under it, on the reactions row,
 * "Reply" (or "3 replies") opens the thread in place; a tap or click
 * outside the post, or Escape, folds it, and an unsent reply waits for
 * the next opening. The author and an organizer get a quiet "…" (shown on
 * hover with a mouse, always on a touch screen) that opens "Delete for
 * everyone?".
 *
 * Inputs: the entry and its id, the viewer, its votes and replies, whether
 * it is still sending, what voting, replying and deleting do, and the reactions row.
 * Output: the block.
 * Examples (checked on the emulator with two profiles):
 *   TO's poll, 4 Yes and 1 No, you voted Yes → "Yes" with a check, its bar at 80 %, "5 of 8 voted · tap to change your vote"
 *   "2 replies" tapped, then a tap on the map  → the thread folds; "Reply" again shows the half-written reply
 */
export function Written({ id, entry, viewer, votes, replies, sending, onVote, onReply, onDelete, reactions }: WrittenProps) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const block = useRef<HTMLElement>(null);
  const author = entry.by ? person(viewer, entry.by).name : "";
  const mayDelete = entry.by === viewer.memberId || viewer.isOrganizer;
  const thread = Object.entries(replies ?? {}).sort(([, a], [, b]) => a.at - b.at);
  const repliers = [...new Set(thread.map(([, reply]) => reply.by))];
  const mine = votes?.[viewer.memberId];
  const poll = entry.kind === "poll" && entry.options ? tally(entry.options, votes) : null;

  useFoldOutside(open || asking, block, () => {
    setOpen(false);
    setAsking(false);
  });

  const replyControl = (
    <button type="button" className="reps" aria-expanded={open} onClick={() => setOpen(!open)}>
      {thread.length > 0 ? (
        <>
          <span className="avs" aria-hidden="true">
            {repliers.slice(0, 3).map((who) => (
              <Face key={who} person={person(viewer, who)} className={faceClass(viewer, who)} />
            ))}
          </span>
          {open ? "Hide replies" : `${thread.length} ${thread.length === 1 ? "reply" : "replies"}`}
        </>
      ) : (
        <>
          <Icon name="chat" size={14} />
          {open ? "Close" : "Reply"}
        </>
      )}
    </button>
  );

  return (
    <article ref={block} className={`row fp${sending ? " sending" : ""}`} aria-labelledby={`fp-${id}`}>
      <Who viewer={viewer} id={entry.by} />
      <div className="row-body">
        <span id={`fp-${id}`} className="row-label">
          <Head name={author} at={entry.at} viewer={viewer} sending={sending}>
            {mayDelete && !sending && !asking && <MoreButton onClick={() => setAsking(true)} />}
          </Head>
        </span>
        {asking && <DeleteAsk onDelete={onDelete} onKeep={() => setAsking(false)} />}
        {entry.gif && (
          <img className="fp-gif" src={entry.gif} alt="GIF" width={entry.gifW} height={entry.gifH} style={entry.gifW && entry.gifH ? { aspectRatio: `${entry.gifW} / ${entry.gifH}` } : undefined} loading="lazy" decoding="async" />
        )}
        {entry.text && !poll && <RichText className="fp-t" text={entry.text} />}
        {poll && (
          <div className="fp-poll">
            <RichText className="fp-q" text={entry.text ?? ""} />
            {poll.options.map((option, index) => (
              <button key={index} type="button" className={`po${mine === index ? " mine" : ""}`} aria-pressed={mine === index} onClick={() => mine !== index && onVote(index)}>
                <span className="bar" style={{ transform: `scaleX(${option.share})` }} />
                <span className="lb">
                  {mine === index && <Icon name="check" size={16} />}
                  {option.label}
                </span>
                <span className="avs" aria-label={option.voters.map((voter) => person(viewer, voter).name).join(", ")}>
                  {option.voters.slice(0, 5).map((voter) => (
                    <Face key={voter} person={person(viewer, voter)} className={faceClass(viewer, voter)} />
                  ))}
                </span>
                <b>{option.voters.length}</b>
              </button>
            ))}
            <p className="pm">
              {poll.voted} of {Math.max(viewer.crewSize, poll.voted)} voted · {mine === undefined ? "tap to vote" : "tap to change your vote"}
            </p>
          </div>
        )}
        {!sending && reactions(replyControl)}
        {!sending && open && (
          <div className="fp-replies">
            {thread.map(([replyId, reply]) => (
              <div key={replyId} className="rp">
                <Who viewer={viewer} id={reply.by} />
                <div className="rp-body">
                  <Head name={person(viewer, reply.by).name} at={reply.at} viewer={viewer} />
                  <RichText className="rp-t" text={reply.text} />
                </div>
              </div>
            ))}
            <Composer placeholder="Reply" small autoFocus draftKey={id} onSend={(draft) => onReply(draft.text)} />
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Folds something open (a thread, the delete question) when the friend
 * taps or clicks outside it, or presses Escape. A tap inside, including in
 * a panel opened from inside it, keeps it open.
 * Inputs: whether it is open, the block, and what folding does.
 * Output: nothing.
 * Examples (checked on screen): thread open, tap the map → it folds; tap a reaction pill on the same post → it stays
 */
function useFoldOutside(open: boolean, block: React.RefObject<HTMLElement>, fold: () => void) {
  const latest = useRef(fold);
  latest.current = fold;
  useEffect(() => {
    if (!open) return;
    const away = (event: Event) => {
      // Escape folds it, unless a panel is open above the page: that Escape closes the panel.
      if (event.type === "keydown") {
        if ((event as KeyboardEvent).key === "Escape" && !document.querySelector("dialog[open]")) latest.current();
        return;
      }
      const target = event.target as Node;
      // A panel opened from inside the post (the reply bar's emoji) belongs to it; so does any open dialog above the page.
      if (block.current?.contains(target) || (target instanceof Element && target.closest("dialog[open]"))) return;
      latest.current();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", away);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", away);
    };
  }, [open, block]);
}
