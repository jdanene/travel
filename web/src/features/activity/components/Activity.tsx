import { Fragment, useEffect, useRef, useState } from "react";
import { newActivityId } from "../../../lib/activity";
import type { ActivityEntry, ActivityReply, MemberId } from "../../../types/trip";
import { post, react, remove, reply, vote } from "../api/activity";
import type { Draft } from "../lib/lines";
import { whenLabels } from "../lib/lines";
import { Composer } from "./Composer";
import { LineRow, Written, type Viewer } from "./Entries";
import { EmojiSheet, Reactions } from "./Reactions";
import "./Activity.css";

/** Lines drawn before "Show more", and how many more each tap adds (mock 5 draws six). */
const FIRST = 6;
const MORE = 10;

interface ActivityProps {
  tripId: string;
  entries: Record<string, ActivityEntry> | undefined;
  votes: Record<string, Record<MemberId, number>> | undefined;
  replies: Record<string, Record<string, ActivityReply>> | undefined;
  /** Emoji on each line: { entryId: { memberId: emoji } }. */
  reactions: Record<string, Record<MemberId, string>> | undefined;
  memberId: MemberId;
  isOrganizer: boolean;
  /** Member id to name, for every member who replied. */
  names: Record<MemberId, string>;
  /** How many friends replied; 1 means just you. */
  crewSize: number;
  /** The small picture of a line's thing (a stay's photo, a link's thumbnail), when it has one. */
  thumbOf: (entry: ActivityEntry) => string | undefined;
  /** What a tap on an automatic line does (open its module, or the crew); undefined when it opens nothing. */
  openerOf: (entry: ActivityEntry) => (() => void) | undefined;
}

/**
 * The Activity card of mock 5, the last card on the home page: one list, newest first, with day dividers ("TODAY",
 * "YESTERDAY", "SAT 21 NOV") and "Show more" after six. Automatic lines
 * are a face and one line; posts and polls sit in a light box. A friend's
 * own post shows at once, marked "Sending…" until the server has it, and
 * new lines ease in at the top. With just you on the trip, the card says
 * "Just you so far" in place of the list. No "new" badges or counts.
 *
 * Inputs: the trip id, the activity branch with its votes and replies,
 * this device's member and organizer mark, the names, the crew's size,
 * and from the shell each line's thumbnail and what tapping it opens.
 * Output: the card.
 * Examples (checked on the emulator with two profiles at 375 px and 1650 px):
 *   RB posts "Anyone flying from London?" → on top at once, "Sending…" for a moment; on KA's phone it eases in
 *   KA adds an event                      → "KA added an event: …" tops RB's list; a tap opens Events
 *   only you                              → "Just you so far" and the bar
 */
export function Activity({ tripId, entries, votes, replies, reactions, memberId, isOrganizer, names, crewSize, thumbOf, openerOf }: ActivityProps) {
  const [shown, setShown] = useState(FIRST);
  const [sending, setSending] = useState<ReadonlySet<string>>(new Set());
  const [problem, setProblem] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const now = useMinuteClock();
  // Ids drawn on the first render do not ease in; every later one does, once.
  const seen = useRef<Set<string> | null>(null);
  const ids = Object.entries(entries ?? {})
    .sort(([a, x], [b, y]) => y.at - x.at || (a < b ? 1 : -1))
    .map(([id]) => id);
  if (seen.current === null) seen.current = new Set(ids);
  useEffect(() => {
    ids.forEach((id) => seen.current!.add(id));
  });

  const viewer: Viewer = { memberId, isOrganizer, names, crewSize, now };
  const alone = crewSize <= 1 && ids.every((id) => entries![id].kind === "joined");

  const send = (draft: Draft) => {
    const id = newActivityId(tripId);
    setSending((old) => new Set(old).add(id));
    return post(tripId, id, memberId, draft).then((result) => {
      setSending((old) => {
        const next = new Set(old);
        next.delete(id);
        return next;
      });
      return result;
    });
  };
  const report = (result: { ok: boolean }) => setProblem(result.ok ? null : "That did not save. Try again.");

  let lastDay = "";
  return (
    <section className="feedcard" aria-labelledby="activity-title">
      <h2 id="activity-title">Feed</h2>
      {alone ? (
        <p className="empty">
          <b>Just you so far</b>Share the trip link. When friends join, set dates or add a place, a line shows up here.
        </p>
      ) : ids.length === 0 ? (
        <p className="empty">When friends join, set dates or add a place, a line shows up here.</p>
      ) : (
        <div className="feed">
          {ids.slice(0, shown).map((id) => {
            const entry = entries![id];
            const { day } = whenLabels(entry.at, now);
            const divider = day !== lastDay;
            lastDay = day;
            const arrive = !seen.current!.has(id);
            const written = entry.kind === "post" || entry.kind === "poll";
            return (
              <Fragment key={id}>
                {divider && <p className="dv">{day}</p>}
                <div className={`fi${arrive ? " arrive" : ""}`}>
                  {written ? (
                    <Written
                      id={id}
                      entry={entry}
                      viewer={viewer}
                      votes={votes?.[id]}
                      replies={replies?.[id]}
                      sending={sending.has(id)}
                      onVote={(index) => void vote(tripId, id, memberId, index).then(report)}
                      onReply={(text) => reply(tripId, id, memberId, text)}
                      onDelete={() => void remove(tripId, id).then(report)}
                    />
                  ) : (
                    <LineRow entry={entry} viewer={viewer} thumb={thumbOf(entry)} onOpen={openerOf(entry)} />
                  )}
                  {!sending.has(id) && (
                    <Reactions
                      marks={reactions?.[id]}
                      memberId={memberId}
                      names={names}
                      onReact={(emoji) => void react(tripId, id, memberId, emoji).then(report)}
                      onPick={() => setPicking(id)}
                    />
                  )}
                </div>
              </Fragment>
            );
          })}
          {ids.length > shown && (
            <button type="button" className="more" onClick={() => setShown(shown + MORE)}>
              <span>Show more</span>
            </button>
          )}
        </div>
      )}
      {/* The message bar sits at the foot of the feed (owner, 24 Nov 2026). */}
      {problem && (
        <p className="msg-error" role="alert">
          {problem}
        </p>
      )}
      <Composer placeholder="Message" onSend={send} />
      <EmojiSheet
        open={picking !== null}
        onClose={() => setPicking(null)}
        onPick={(emoji) => {
          if (picking) void react(tripId, picking, memberId, emoji).then(report);
          setPicking(null);
        }}
      />
    </section>
  );
}

/** This device's clock, moved on once a minute, so "2 h ago" and "TODAY" stay true while the page is open. */
function useMinuteClock(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(tick);
  }, []);
  return now;
}
