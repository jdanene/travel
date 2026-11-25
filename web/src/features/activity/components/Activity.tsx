import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { newActivityId } from "../../../lib/activity";
import type { ActivityEntry, ActivityReactions, ActivityReply, MemberId } from "../../../types/trip";
import { post, postGif, react, remove, reply, vote, removeReply } from "../api/activity";
import type { KlipyItem } from "../lib/klipy";
import type { Draft } from "../lib/lines";
import { lineWords, whenLabels } from "../lib/lines";
import { reactionKey } from "../lib/reactions";
import { Composer, type ReplyTarget } from "./Composer";
import { LineRow, Written, type ThreadProps, type Viewer } from "./Entries";
import { ReactionPicker } from "./Pickers";
import { ReactionRow } from "./ReactionRow";
import "./Activity.css";

/** Lines drawn at first, and how many earlier ones each step up adds. */
const FIRST = 30;
const EARLIER = 20;
/** Within this many px of the foot, the list counts as "at the latest" and follows new lines. */
const NEAR_FOOT = 48;
/** Within this many px of the top, earlier lines load. */
const NEAR_TOP = 160;

interface ActivityProps {
  tripId: string;
  entries: Record<string, ActivityEntry> | undefined;
  votes: Record<string, Record<MemberId, number>> | undefined;
  replies: Record<string, Record<string, ActivityReply>> | undefined;
  /** Emoji on each line, as stored (types/trip.ts, ActivityReactions). */
  reactions: Record<string, ActivityReactions> | undefined;
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
 * The Feed, as a chat reads (Discord): oldest at the top, newest at the
 * foot just above the message bar, with day dividers ("TODAY",
 * "YESTERDAY", "SAT 21 NOV") in the same order. It opens at the latest
 * line, follows new ones while the friend is at the foot, and when they
 * have scrolled up it leaves them there and shows a small "New messages"
 * pill instead. Earlier lines load as the friend nears the top (or with
 * "Show earlier"). The list keeps one height and fades at an edge that
 * has more beyond it; the bar sits under it and never covers a line.
 *
 * Every line has one shape: the face, the name with the time beside it,
 * what happened or what was said under it, then its emoji pills. A
 * friend's own post shows at once, marked "Sending…" until the server
 * has it. With just you on the trip, the card says "Just you so far".
 *
 * Replies use the one message bar, as on Discord: "Reply" on any line puts
 * the bar in reply mode ("Replying to KA", the line lightly marked, the
 * keyboard up); sending, words or a GIF, goes into that line's thread,
 * opens it, and leaves reply mode. × or Escape leaves it too. The answered
 * line moves to the foot of the list, right above the bar, so it stays in
 * sight when the keyboard comes up. Every line's replies show under it
 * by default (owner, 25 Nov 2026: "when we reply to an update don't want it
 * hidden", "default is open"); "Hide replies" folds one line's thread until
 * the page reloads.
 *
 * Inputs: the trip id, the activity branch with its votes, replies and
 * emoji, this device's member and organizer mark, the names, the crew's
 * size, and from the shell each line's thumbnail and what tapping it opens.
 * Output: the card.
 * Examples (checked on the emulator with two profiles at 375 px and 1650 px):
 *   RB sends "Anyone flying from London?" → it lands at the foot at once, "Sending…" for a moment; KA, at the foot, sees it slide in
 *   KA has scrolled up when RB posts      → KA stays put; "New messages" shows; a tap goes to the foot
 *   only you                              → "Just you so far" and the bar
 *   "Reply" on KA's "joined", send "Welcome!" → KA's thread opens with "Welcome!"; the bar is a plain message bar again
 */
export function Activity({ tripId, entries, votes, replies, reactions, memberId, isOrganizer, names, crewSize, thumbOf, openerOf }: ActivityProps) {
  const [shown, setShown] = useState(FIRST);
  const [sending, setSending] = useState<ReadonlySet<string>>(new Set());
  const [problem, setProblem] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  // The threads this friend folded with "Hide replies" (every other one is open), and the line the message bar answers (reply mode), by line id.
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
  const fold = useCallback((id: string, open: boolean) => {
    setFolded((before) => {
      if (open !== before.has(id)) return before;
      const next = new Set(before);
      if (open) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement | null>(null);
  const [unseen, setUnseen] = useState(false);
  const [edges, setEdges] = useState({ top: false, foot: false });
  const pickAnchor = useRef<HTMLElement | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const atFoot = useRef(true);
  const lastTop = useRef(0);
  const keepFrom = useRef<{ height: number; top: number } | null>(null);
  const now = useMinuteClock();

  // Oldest first, as a chat reads.
  const ids = Object.entries(entries ?? {})
    .sort(([a, x], [b, y]) => x.at - y.at || (a < b ? -1 : 1))
    .map(([id]) => id);
  const visible = ids.slice(-shown);
  const earlier = ids.length > visible.length;
  const newest = ids[ids.length - 1];

  // Ids drawn on the first render do not ease in; every later one does, once.
  const seen = useRef<Set<string> | null>(null);
  if (seen.current === null) seen.current = new Set(ids);
  useEffect(() => {
    ids.forEach((id) => seen.current!.add(id));
  });

  const viewer: Viewer = { memberId, isOrganizer, names, crewSize, now };
  const alone = crewSize <= 1 && ids.every((id) => entries![id].kind === "joined");

  const toFoot = useCallback((smooth: boolean) => {
    const box = scroller.current;
    if (!box) return;
    box.scrollTo({ top: box.scrollHeight, behavior: smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" });
    atFoot.current = true;
    setUnseen(false);
  }, []);

  const measure = () => {
    const box = scroller.current;
    if (!box) return;
    const gap = box.scrollHeight - box.scrollTop - box.clientHeight;
    // Only the friend scrolling up leaves the foot; a scroll on its way down (ours, smooth) does not.
    const goingUp = box.scrollTop < lastTop.current - 1;
    lastTop.current = box.scrollTop;
    if (gap < NEAR_FOOT) atFoot.current = true;
    else if (goingUp) atFoot.current = false;
    if (atFoot.current) setUnseen(false);
    setEdges({ top: box.scrollTop > 2, foot: gap > 2 });
    if (box.scrollTop < NEAR_TOP && earlier && !keepFrom.current) showEarlier();
  };

  const showEarlier = () => {
    const box = scroller.current;
    if (box) keepFrom.current = { height: box.scrollHeight, top: box.scrollTop };
    setShown((old) => old + EARLIER);
  };

  // Opens at the latest line.
  useLayoutEffect(() => {
    toFoot(false);
    measure();
  }, []);

  // Earlier lines go in above without moving what the friend is reading.
  useLayoutEffect(() => {
    const box = scroller.current;
    const from = keepFrom.current;
    if (!box || !from) return;
    box.scrollTop = from.top + (box.scrollHeight - from.height);
    keepFrom.current = null;
  }, [shown]);

  // A new line: follow it at the foot (always for your own), else say there is something below.
  const lastNewest = useRef(newest);
  useLayoutEffect(() => {
    if (newest === lastNewest.current) return;
    lastNewest.current = newest;
    if (!newest) return;
    if (atFoot.current || entries?.[newest]?.by === memberId) toFoot(true);
    else setUnseen(true);
  }, [newest, entries, memberId, toFoot]);

  // While at the foot, growth (a reaction row, an opened thread, a GIF) keeps the foot in view.
  useEffect(() => {
    const box = scroller.current;
    const list = box?.firstElementChild;
    if (!box || !list) return;
    const watch = new ResizeObserver(() => {
      if (atFoot.current) box.scrollTop = box.scrollHeight;
      setEdges({ top: box.scrollTop > 2, foot: box.scrollHeight - box.scrollTop - box.clientHeight > 2 });
    });
    watch.observe(list);
    return () => watch.disconnect();
  }, [alone, ids.length === 0]);

  const send = <T,>(write: (id: string) => Promise<T>): Promise<T> => {
    const id = newActivityId(tripId);
    setSending((old) => new Set(old).add(id));
    return write(id).then((result) => {
      setSending((old) => {
        const next = new Set(old);
        next.delete(id);
        return next;
      });
      return result;
    });
  };
  const report = (result: { ok: boolean }) => setProblem(result.ok ? null : "That did not save. Try again.");

  // The answered line sits at the foot of the list, right above the bar, so it stays in sight with the keyboard up.
  // Only the list scrolls here; the page is the bar's business (Composer, useAboveKeyboard).
  // The list can change height while the keyboard comes up, so it follows the list's size until reply mode ends.
  useLayoutEffect(() => {
    const box = scroller.current;
    if (!box || !replyTo) return;
    const align = () => {
      const line = box.querySelector<HTMLElement>(`[data-line="${replyTo}"]`);
      if (!line) return;
      const gap = line.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom;
      if (Math.abs(gap) > 1) box.scrollTop += gap;
    };
    align();
    const watch = new ResizeObserver(align);
    watch.observe(box);
    return () => watch.disconnect();
  }, [replyTo]);

  // Escape leaves reply mode, unless a panel above the page takes that Escape.
  useEffect(() => {
    if (!replyTo) return;
    const leave = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) setReplyTo(null);
    };
    document.addEventListener("keydown", leave);
    return () => document.removeEventListener("keydown", leave);
  }, [replyTo]);
  // A line deleted while the bar answers it ends reply mode.
  if (replyTo && !entries?.[replyTo]) setReplyTo(null);

  const threadOf = (id: string): ThreadProps => ({
    replies: replies?.[id],
    open: !folded.has(id),
    onOpen: (open) => fold(id, open),
    answering: replyTo === id,
    onReply: () => {
      // Focus inside the tap, so a phone raises its keyboard; the bar scrolls itself above it.
      field.current?.focus({ preventScroll: true });
      setReplyTo(id);
    },
    onDeleteReply: (replyId) => void removeReply(tripId, id, replyId).then(report),
  });

  // A reply just sent must be in sight: the list scrolls until the foot of that line's thread shows (seen on an
  // iPhone simulator, 25 Nov 2026: the new reply landed below the list's edge).
  const sentTo = useRef<string | null>(null);
  useLayoutEffect(() => {
    const box = scroller.current;
    const id = sentTo.current;
    if (!box || !id) return;
    const line = box.querySelector<HTMLElement>(`[data-line="${id}"]`);
    if (!line) return;
    const gap = line.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom;
    if (gap > 1) box.scrollTop += gap;
  }, [replies, replyTo]);

  // Sends into the answered line's thread and shows it; on a failure reply mode comes back, as the words do.
  const sendReply = (said: Parameters<typeof reply>[3]) => {
    const target = replyTo!;
    sentTo.current = target;
    window.setTimeout(() => {
      if (sentTo.current === target) sentTo.current = null;
    }, 3000);
    fold(target, true);
    setReplyTo(null);
    return reply(tripId, target, memberId, said).then((result) => {
      if (!result.ok) setReplyTo(target);
      return result;
    });
  };

  const reactionsOf = (id: string) => (after?: ReactNode) => (
    <ReactionRow
      raw={reactions?.[id]}
      memberId={memberId}
      names={names}
      onToggle={(key, on) => void react(tripId, id, memberId, key, on).then(report)}
      onAdd={(button) => {
        pickAnchor.current = button;
        setPicking(id);
      }}
      after={after}
    />
  );

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
        <div className="feed-wrap">
          <div ref={scroller} className={`feed${edges.top ? " fade-top" : ""}${edges.foot ? " fade-foot" : ""}`} onScroll={measure} role="log" aria-label="Feed lines">
            <div className="feed-list">
              {earlier && (
                <button type="button" className="earlier" onClick={showEarlier}>
                  Show earlier
                </button>
              )}
              {visible.map((id) => {
                const entry = entries![id];
                const { day } = whenLabels(entry.at, now);
                const divider = day !== lastDay;
                lastDay = day;
                const arrive = !seen.current!.has(id);
                const written = entry.kind === "post" || entry.kind === "poll";
                return (
                  <Fragment key={id}>
                    {divider && (
                      <p className="dv">
                        <span>{day}</span>
                      </p>
                    )}
                    <div className={`fi${arrive ? " arrive" : ""}`} data-line={id}>
                      {written ? (
                        <Written
                          id={id}
                          entry={entry}
                          viewer={viewer}
                          votes={votes?.[id]}
                          thread={threadOf(id)}
                          sending={sending.has(id)}
                          onVote={(index) => void vote(tripId, id, memberId, index).then(report)}
                          onDelete={() => void remove(tripId, id).then(report)}
                          reactions={reactionsOf(id)}
                        />
                      ) : (
                        <LineRow
                          id={id}
                          entry={entry}
                          viewer={viewer}
                          thumb={thumbOf(entry)}
                          onOpen={openerOf(entry)}
                          thread={threadOf(id)}
                          reactions={reactionsOf(id)}
                          onDelete={entry.by === memberId ? () => void remove(tripId, id).then(report) : undefined}
                        />
                      )}
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
          {unseen && (
            <button type="button" className="unseen" onClick={() => toFoot(true)}>
              New messages
              <svg viewBox="0 0 24 24" width="14" height="14" className="i" aria-hidden="true">
                <path d="M12 5v14M6 13l6 6 6-6" />
              </svg>
            </button>
          )}
        </div>
      )}
      {problem && (
        <p className="msg-error" role="alert">
          {problem}
        </p>
      )}
      <Composer
        placeholder="Message"
        fieldRef={field}
        replyTo={replyTo && entries?.[replyTo] ? { id: replyTo, label: answerLabel(entries[replyTo], names) } : null}
        onCancelReply={() => setReplyTo(null)}
        onSend={(draft: Draft) => (replyTo ? sendReply(draft.text) : send((id) => post(tripId, id, memberId, draft)))}
        onGif={(item: KlipyItem) => (replyTo ? sendReply(item.full) : send((id) => postGif(tripId, id, memberId, item.full)))}
      />
      <ReactionPicker
        open={picking !== null}
        anchor={pickAnchor as React.RefObject<HTMLElement>}
        onClose={() => setPicking(null)}
        onPick={(choice) => {
          if (picking) void react(tripId, picking, memberId, reactionKey(choice), true).then(report);
          setPicking(null);
        }}
      />
    </section>
  );
}

/** The longest automatic-line words the reply strip shows before "…". */
const LABEL_MAX = 40;

/**
 * Who or what the bar answers, for "Replying to …": the author's name, or
 * for a line with no author (a found event) its own words, shortened.
 * Inputs: the line and the names. Output: the label.
 * Examples (checked on screen):
 *   KA's message                           → "KA"
 *   "New event found: Zamna at Phuket, 29 Jan, with a long name" → "New event found: Zamna at Phuket, 29 Ja…"
 */
function answerLabel(entry: ActivityEntry, names: Record<MemberId, string>): ReplyTarget["label"] {
  if (entry.by) return names[entry.by] ?? entry.by;
  const { lead, rest } = lineWords(entry, "");
  const words = `${lead} ${rest}`.trim();
  return words.length > LABEL_MAX ? `${words.slice(0, LABEL_MAX - 1).trimEnd()}…` : words;
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
