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
 * Adds a reply under a post or a poll, under the member's own name.
 * Inputs: the trip, the post's id, the member, and the reply's text (1 to 500 characters, trimmed).
 * Output: the write result.
 * Examples (checked on the emulator): KA replies "Me!" under RB's post → "1 reply" under it on every phone
 */
export function reply(tripId: string, id: string, memberId: MemberId, text: string): Promise<WriteResult> {
  const entry: ActivityReply = { by: memberId, at: Date.now(), text };
  return write({ [paths.activityReply(tripId, id, newActivityId(tripId))]: entry });
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
 * Puts the member's emoji on a Feed line, or takes it off. One emoji each;
 * a new one replaces the old.
 * Inputs: the trip, the line's id, the member, and the emoji (null takes it off).
 * Output: the write result.
 * Examples (checked on the emulator): KA picks 🔥 on RB's post → "🔥 1" under it on every phone; KA taps it again → gone
 */
export function react(tripId: string, id: string, memberId: MemberId, emoji: string | null): Promise<WriteResult> {
  return write({ [paths.activityReaction(tripId, id, memberId)]: emoji });
}
