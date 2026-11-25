import type { Member, MemberId, Reply } from "../../../types/trip";

/** The three replies of screen 12/1, in the mock's words. */
export const REPLIES: Array<{ reply: Reply; label: string; tone: "yes" | "maybe" | "no" }> = [
  { reply: "in", label: "I'm in", tone: "yes" },
  { reply: "maybe", label: "Maybe", tone: "maybe" },
  { reply: "out", label: "Can't", tone: "no" },
];

/**
 * Lists the expected friends who have not replied, in the trip file's
 * order, so the invitation can say "RJ and LC not yet" and the organizer
 * can see who is missing.
 *
 * Inputs: expected — member id to name, from the trip file (may be empty).
 * members — the members who replied.
 * Output: the expected friends with no member record, as { id, name }.
 * Examples (checked by hand; the owner keeps tests to the risky rules):
 *   expected RJ, LC, JD; JD replied  → [RJ, LC]
 *   no expected names                → []
 */
export function notReplied(
  expected: Record<MemberId, string>,
  members: Record<MemberId, Member>,
): Array<{ id: MemberId; name: string }> {
  return Object.entries(expected)
    .filter(([id]) => members[id] === undefined)
    .map(([id, name]) => ({ id, name }));
}

/**
 * How many replied, of how many, for the line under the invitation's
 * buttons (12/1): "6 of 8 replied".
 *
 * Inputs: expected and members, as for notReplied().
 * Output: "6 of 8 replied". With no expected names, "6 replied" (case 8).
 * A friend who joined by typing a name counts in both numbers.
 * Examples (checked by hand):
 *   8 expected, 6 replied   → "6 of 8 replied"
 *   no expected, 6 replied  → "6 replied"
 */
export function repliedLine(expected: Record<MemberId, string>, members: Record<MemberId, Member>): string {
  const replied = Object.keys(members).length;
  if (Object.keys(expected).length === 0) return `${replied} replied`;
  return `${replied} of ${replied + notReplied(expected, members).length} replied`;
}
