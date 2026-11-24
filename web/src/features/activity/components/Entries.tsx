import { useState } from "react";
import { Face, tone, type Person } from "../../../components/Avatars";
import { Icon } from "../../../components/Icon";
import type { WriteResult } from "../../../lib/db";
import type { ActivityEntry, ActivityReply, MemberId } from "../../../types/trip";
import { lineWords, tally, whenLabels } from "../lib/lines";
import { Composer } from "./Composer";

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
const faceClass = (viewer: Viewer, id: MemberId) => (id === viewer.memberId ? "you" : tone(id));

/** A member's circle: their photo, else their initials, in their tone. */
function Who({ viewer, id }: { viewer: Viewer; id: MemberId | undefined }) {
  if (!id)
    return (
      <span className="av sys" aria-hidden="true">
        <Icon name="spark" size={16} />
      </span>
    );
  return <Face person={person(viewer, id)} className={faceClass(viewer, id)} />;
}

/**
 * One automatic line, as mock 5 draws it: a face, one line with the name in
 * bold and the time under it, and a small picture on the right when the
 * thing has one. A line that refers to a module is a button that opens it.
 *
 * Inputs: the entry, the viewer, its thumbnail (or undefined), and what a
 * tap does (or undefined when the line opens nothing).
 * Output: the row.
 * Examples (checked on screen): KA's stay-added line → "KA added a place: Cliffside villa", "2 h ago", the villa's photo; a tap opens Stay
 */
export function LineRow({ entry, viewer, thumb, onOpen }: { entry: ActivityEntry; viewer: Viewer; thumb?: string; onOpen?: () => void }) {
  const { lead, rest } = lineWords(entry, entry.by ? person(viewer, entry.by).name : "");
  const inner = (
    <>
      <Who viewer={viewer} id={entry.by} />
      <p>
        <b>{lead}</b> {rest}
        <time dateTime={new Date(entry.at).toISOString()}>{whenLabels(entry.at, viewer.now).time}</time>
      </p>
      {thumb && <span className="th" style={{ backgroundImage: `url("${thumb}")` }} aria-hidden="true" />}
    </>
  );
  return onOpen ? (
    <button type="button" className="fl" onClick={onOpen}>
      {inner}
    </button>
  ) : (
    <div className="fl">{inner}</div>
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
}

/**
 * A friend's post or poll, a little more prominent than the automatic
 * lines: "TO asked · 3 h ago" over a bordered box. A poll lists its options
 * with a bar for each share, the voters' faces and the count; a tap votes,
 * and a tap on another option changes the vote. Under the box the replies
 * sit folded ("3 replies") and open in place, with a small reply bar. The
 * author and an organizer see "Delete", which asks once more.
 *
 * Inputs: the entry and its id, the viewer, its votes and replies, whether
 * it is still sending, and what voting, replying and deleting do.
 * Output: the block.
 * Examples (checked on the emulator with two profiles):
 *   TO's poll, 4 Yes and 1 No, you voted Yes → "Yes" pressed with a check, its bar at 80 %, "5 of 8 voted · tap to change your vote"
 *   "2 replies" tapped                       → the two replies, then a "Reply" bar with focus
 */
export function Written({ id, entry, viewer, votes, replies, sending, onVote, onReply, onDelete }: WrittenProps) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const author = entry.by ? person(viewer, entry.by).name : "";
  const { lead, rest } = lineWords(entry, author);
  const mayDelete = entry.by === viewer.memberId || viewer.isOrganizer;
  const thread = Object.entries(replies ?? {}).sort(([, a], [, b]) => a.at - b.at);
  const repliers = [...new Set(thread.map(([, reply]) => reply.by))];
  const mine = votes?.[viewer.memberId];
  const poll = entry.kind === "poll" && entry.options ? tally(entry.options, votes) : null;

  return (
    <article className={`fp${sending ? " sending" : ""}`} aria-labelledby={`fp-${id}`}>
      <div className="fpw">
        <Who viewer={viewer} id={entry.by} />
        <span id={`fp-${id}`}>
          <b>{lead}</b> {rest} · {sending ? "Sending…" : whenLabels(entry.at, viewer.now).time}
        </span>
        {mayDelete && !sending && !asking && (
          <button type="button" className="fp-del" onClick={() => setAsking(true)}>
            Delete
          </button>
        )}
      </div>
      {asking && (
        <div className="fp-ask" role="group" aria-label="Delete for everyone?">
          <span>Delete for everyone?</span>
          <button type="button" className="fp-yes" onClick={onDelete}>
            Delete
          </button>
          <button type="button" onClick={() => setAsking(false)}>
            Keep
          </button>
        </div>
      )}
      <div className="box">
        <p className={poll ? "q" : "t"}>{entry.text}</p>
        {poll && (
          <>
            {poll.options.map((option, index) => (
              <button
                key={index}
                type="button"
                className={`po${mine === index ? " mine" : ""}`}
                aria-pressed={mine === index}
                onClick={() => mine !== index && onVote(index)}
              >
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
          </>
        )}
      </div>
      {!sending && (
        <div className="fp-thread">
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
                <Icon name="chat" size={16} />
                {open ? "Close" : "Reply"}
              </>
            )}
          </button>
          {open && (
            <div className="fp-replies">
              {thread.map(([replyId, reply]) => (
                <div key={replyId} className="rp">
                  <Who viewer={viewer} id={reply.by} />
                  <p>
                    <b>{person(viewer, reply.by).name}</b> {reply.text}
                    <time dateTime={new Date(reply.at).toISOString()}>{whenLabels(reply.at, viewer.now).time}</time>
                  </p>
                </div>
              ))}
              <Composer placeholder="Reply" small autoFocus onSend={(draft) => onReply(draft.text)} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}
