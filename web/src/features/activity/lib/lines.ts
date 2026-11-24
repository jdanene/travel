import type { ActivityEntry, MemberId } from "../../../types/trip";

/**
 * The Activity list's pure rules: what each line says, how a poll counts,
 * and how lines group by day. The words are mock 5's
 * (public/mockups/crew/5): "KA added a place: Cliffside villa".
 */

/** A line in two parts: the bold lead (a name, or "New event found:") and the words after it. */
export interface LineWords {
  lead: string;
  rest: string;
}

/**
 * Says what one Activity line reads, in the mock's words, so every line in
 * the list is built one way.
 *
 * Inputs: entry — the line as stored (its text was saved with it); name —
 * the author's name, or "" when the author is unknown.
 * Output: { lead, rest }; the page draws lead in bold, then rest. A line
 * whose text is missing reads without its colon part.
 * Examples (each is a test in lines.test.ts):
 *   joined, RJ                                     → { lead: "RJ", rest: "joined" }
 *   reply-changed "maybe", SN                      → { lead: "SN", rest: "said maybe" }
 *   reply-changed "out", AJ                        → { lead: "AJ", rest: "can't make it" }
 *   dates-added "18–24 Feb", KA                    → { lead: "KA", rest: "added dates: 18–24 Feb" }
 *   dates-confirmed "13–23 Feb", Dom               → { lead: "Dom", rest: "confirmed the dates: 13–23 Feb" }
 *   dates-changed, Dom                             → { lead: "Dom", rest: "changed the dates" }
 *   stay-added "Cliffside villa", KA               → { lead: "KA", rest: "added a place: Cliffside villa" }
 *   stay-confirmed "Cliffside villa", Dom          → { lead: "Dom", rest: "confirmed the stay: Cliffside villa" }
 *   event-added "Boat party at Bottle Beach", KA   → { lead: "KA", rest: "added an event: Boat party at Bottle Beach" }
 *   event-in "Peggy Gou at Savaya", TO             → { lead: "TO", rest: "is in for Peggy Gou at Savaya" }
 *   link-added "TikTok", LC                        → { lead: "LC", rest: "added a link: TikTok" }
 *   place-added "Sunset bar", RJ                   → { lead: "RJ", rest: "added to the map: Sunset bar" }
 *   event-found "Zamna at Phuket, 29 Jan", no name → { lead: "New event found:", rest: "Zamna at Phuket, 29 Jan" }
 *   post, TO                                       → { lead: "TO", rest: "posted" }
 *   poll, TO                                       → { lead: "TO", rest: "asked" }
 *   stay-added with no text, KA                    → { lead: "KA", rest: "added a place" }
 */
export function lineWords(entry: ActivityEntry, name: string): LineWords {
  const about = (words: string) => (entry.text ? `${words}: ${entry.text}` : words);
  switch (entry.kind) {
    case "joined":
      return { lead: name, rest: "joined" };
    case "reply-changed":
      return { lead: name, rest: entry.text === "in" ? "is in" : entry.text === "out" ? "can't make it" : "said maybe" };
    case "dates-added":
      return { lead: name, rest: about("added dates") };
    case "dates-confirmed":
      return { lead: name, rest: about("confirmed the dates") };
    case "dates-changed":
      return { lead: name, rest: "changed the dates" };
    case "stay-added":
      return { lead: name, rest: about("added a place") };
    case "stay-confirmed":
      return { lead: name, rest: about("confirmed the stay") };
    case "event-added":
      return { lead: name, rest: about("added an event") };
    case "event-in":
      return { lead: name, rest: entry.text ? `is in for ${entry.text}` : "is in for an event" };
    case "link-added":
      return { lead: name, rest: about("added a link") };
    case "place-added":
      return { lead: name, rest: about("added to the map") };
    case "event-found":
      return { lead: "New event found:", rest: entry.text ?? "" };
    case "post":
      return { lead: name, rest: "posted" };
    case "poll":
      return { lead: name, rest: "asked" };
  }
}

/** One option of a poll, counted. */
export interface OptionTally {
  label: string;
  /** The members who picked it, in the order their ids sort. */
  voters: MemberId[];
  /** Its share of all votes, 0 to 1; 0 when nobody voted. */
  share: number;
}

/**
 * Counts a poll: each option's voters and share, and how many voted. A vote
 * can change, so each member counts once, for the option stored now.
 *
 * Inputs: options — the poll's 2 to 4 options; votes — member id to option
 * index (activityVotes/{id}), or undefined before the first vote.
 * Output: { options: one OptionTally per option, in order; voted: the
 * number of members whose vote counts }. A vote for an index the poll does
 * not have counts for nothing.
 * Examples (each is a test in lines.test.ts):
 *   ["Yes", "No"], { to: 0, ka: 0, mb: 0, rj: 0, lc: 1 } → Yes: 4 voters, share 0.8; No: lc, 0.2; voted 5
 *   ["Villa", "Hotel"], undefined                         → both with no voters, share 0; voted 0
 *   ["Yes", "No"], { ka: 0, rb: 3 }                       → Yes: ka, share 1; No: none; voted 1
 */
export function tally(options: string[], votes: Record<MemberId, number> | undefined): { options: OptionTally[]; voted: number } {
  const counted = Object.entries(votes ?? {}).filter(([, index]) => Number.isInteger(index) && index >= 0 && index < options.length);
  const voted = counted.length;
  return {
    voted,
    options: options.map((label, index) => {
      const voters = counted.filter(([, pick]) => pick === index).map(([member]) => member).sort();
      return { label, voters, share: voted === 0 ? 0 : voters.length / voted };
    }),
  };
}

/** What a friend wrote in the message bar: a message, or a poll when options are given. */
export interface Draft {
  text: string;
  /** 2 to 4 options, each 1 to 60 characters; absent for a plain message. */
  options?: string[];
}

/** The longest post, poll question or reply, and the longest poll option (database.rules.json holds the same). */
export const MAX_TEXT = 500;
export const MAX_OPTION = 60;

/**
 * Says whether a draft can be sent, so the send button and the rules agree:
 * text of 1 to 500 characters after trimming, and for a poll 2 to 4
 * options of 1 to 60 characters (empty option fields are dropped first).
 *
 * Inputs: the draft as typed.
 * Output: the draft as it will be stored (trimmed, empty options dropped),
 * or null when it cannot be sent.
 * Examples (each is a test in lines.test.ts):
 *   { text: "  Hi " }                                      → { text: "Hi" }
 *   { text: "Villa or hotel?", options: ["Villa", "", "Hotel"] } → { text: "Villa or hotel?", options: ["Villa", "Hotel"] }
 *   { text: "Villa?", options: ["Villa", ""] }              → null   (one option)
 */
export function readyDraft(draft: Draft): Draft | null {
  const text = draft.text.trim();
  if (text.length < 1 || text.length > MAX_TEXT) return null;
  if (!draft.options) return { text };
  const options = draft.options.map((option) => option.trim()).filter(Boolean);
  if (options.length < 2 || options.length > 4 || options.some((option) => option.length > MAX_OPTION)) return null;
  return { text, options };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Midnight of a moment's day, on this device's clock. */
function dayStart(at: number): number {
  const day = new Date(at);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
}

/**
 * The day divider above a group of lines, and the time beside each line,
 * as the mock writes them: "TODAY" with "2 h ago", "YESTERDAY" with "Mon",
 * then "SAT 21 NOV" with "Sat". Days are this device's days.
 *
 * Inputs: at — the line's moment; now — this device's clock.
 * Output: { day, time }.
 * Examples (checked on screen; the clock makes a test fragile):
 *   3 hours ago, today             → { day: "TODAY", time: "3 h ago" }
 *   yesterday, a Monday            → { day: "YESTERDAY", time: "Mon" }
 *   Sat 21 Nov, three days back    → { day: "SAT 21 NOV", time: "Sat" }
 */
export function whenLabels(at: number, now: number): { day: string; time: string } {
  const days = Math.round((dayStart(now) - dayStart(at)) / 86_400_000);
  const date = new Date(at);
  const weekday = WEEKDAYS[date.getDay()];
  if (days <= 0) {
    const minutes = Math.max(0, Math.floor((now - at) / 60_000));
    const time = minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} h ago`;
    return { day: "TODAY", time };
  }
  if (days === 1) return { day: "YESTERDAY", time: weekday };
  return { day: `${weekday} ${date.getDate()} ${MONTHS[date.getMonth()]}`.toUpperCase(), time: weekday };
}
