import { newActivityId } from "../../../lib/activity";
import { write, type WriteResult } from "../../../lib/db";
import * as paths from "../../../lib/paths";
import type { ActivityEntry, ActivityReply, MemberId } from "../../../types/trip";
import type { Draft } from "../lib/lines";

/**
 * Posts a message or a poll to the Activity list under the friend's own
 * member. The caller makes the id first (newActivityId), so it can mark
 * the line "Sending…" while the write waits; the listener draws the line
 * at once, before the server answers.
 *
 * Inputs: the trip, the new id, the member, and a draft that readyDraft() accepted.
 * Output: the write result; "refused" when this device has not joined.
 * Examples (checked on the emulator with two browser profiles):
 *   RB posts "Anyone flying from London?" → the line shows at once on RB's phone, a moment later on KA's
 *   RB posts a poll with Villa and Hotel  → "RB asked" with both options, no votes
 */
export function post(tripId: string, id: string, memberId: MemberId, draft: Draft): Promise<WriteResult> {
  const entry: ActivityEntry = draft.options
    ? { kind: "poll", by: memberId, at: Date.now(), text: draft.text, options: draft.options }
    : { kind: "post", by: memberId, at: Date.now(), text: draft.text };
  return write({ [paths.activityEntry(tripId, id)]: entry });
}

/**
 * Sets the member's vote on a poll; a new vote replaces the old one.
 * Inputs: the trip, the poll's id, the member, the option's index.
 * Output: the write result.
 * Examples (checked on the emulator): KA taps "Hotel" after "Villa" → activityVotes/<poll>/ka = 1; the counts move on every phone
 */
export function vote(tripId: string, id: string, memberId: MemberId, index: number): Promise<WriteResult> {
  return write({ [paths.activityVote(tripId, id, memberId)]: index });
}

/**
 * Adds a reply under any feed line (a message, a poll or an automatic update), under the member's own name:
 * words, or a GIF or sticker from KLIPY.
 * Inputs: the trip, the line's id, the member, and the reply: its text (1 to 500 characters, trimmed),
 * or a picture on KLIPY's host with its size.
 * Output: the write result; "refused" for a picture off KLIPY's host or a line that is gone.
 * Examples (checked on the emulator with two profiles):
 *   KA replies "Me!" under RB's post        → "1 reply" under it on every phone
 *   KA picks the "hello" GIF in reply mode → the GIF in that line's thread
 */
export function reply(tripId: string, id: string, memberId: MemberId, said: string | { url: string; width: number; height: number }): Promise<WriteResult> {
  const entry: ActivityReply =
    typeof said === "string" ? { by: memberId, at: Date.now(), text: said } : { by: memberId, at: Date.now(), gif: said.url, gifW: said.width, gifH: said.height };
  return write({ [paths.activityReply(tripId, id, newActivityId(tripId))]: entry });
}

/**
 * Deletes one reply for everyone. Its author may, and so may an organizer.
 * Inputs: the trip, the line the reply is under, and the reply's id.
 * Output: the write result; "refused" for anyone else.
 * Examples (checked on the emulator): KA deletes its "Welcome" under AA's "joined" → the reply goes; the line and its other replies stay
 */
export function removeReply(tripId: string, id: string, replyId: string): Promise<WriteResult> {
  return write({ [paths.activityReply(tripId, id, replyId)]: null });
}

/**
 * Deletes a post or a poll for everyone, with its votes and replies, in one
 * write. The author may, and so may an organizer.
 * Inputs: the trip and the post's id.
 * Output: the write result; "refused" for anyone else.
 * Examples (checked on the emulator): RB deletes its own poll → the poll and its votes go on every phone
 */
export function remove(tripId: string, id: string): Promise<WriteResult> {
  return write({ [paths.activityEntry(tripId, id)]: null, [paths.activityVotes(tripId, id)]: null, [paths.activityReplies(tripId, id)]: null, [paths.activityReactions(tripId, id)]: null });
}

/**
 * Posts a GIF or a sticker from KLIPY as a message of its own, as Discord
 * does: the picture's address on KLIPY's host (loaded from there, as its
 * terms ask) and its size, so the feed keeps its place before it loads.
 *
 * Inputs: the trip, the new id, the member, and the picture (url, width, height).
 * Output: the write result; "refused" for an address off KLIPY's host.
 * Examples (checked on the emulator): RB taps the "hello" GIF → "RB" with the GIF under it on every phone
 */
export function postGif(tripId: string, id: string, memberId: MemberId, gif: { url: string; width: number; height: number }): Promise<WriteResult> {
  const entry: ActivityEntry = { kind: "post", by: memberId, at: Date.now(), gif: gif.url, gifW: gif.width, gifH: gif.height };
  return write({ [paths.activityEntry(tripId, id)]: entry });
}

/**
 * Adds one emoji to a Feed line, or takes it off. As on Discord a member
 * may add several different emoji to one line; each is its own key.
 * Inputs: the trip, the line's id, the member, the emoji's key (reactions.ts), and on or off.
 * Output: the write result.
 * Examples (checked on the emulator): KA picks 🔥 on RB's post → "🔥 1" under it on every phone; KA taps the pill again → gone
 */
export function react(tripId: string, id: string, memberId: MemberId, key: string, on: boolean): Promise<WriteResult> {
  return write({ [paths.activityReaction(tripId, id, memberId, key)]: on ? Date.now() : null });
}
