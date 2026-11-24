import { nights } from "../../../lib/format";
import type { Answer, DateOption, Member, MemberId } from "../../../types/trip";

const ANSWERS: readonly Answer[] = ["yes", "maybe", "no"];
const isAnswer = (value: unknown): value is Answer => ANSWERS.includes(value as Answer);

export interface OptionSummary {
  nights: number;
  yes: number;
  maybe: number;
  no: number;
}

/**
 * The line under a date option (20/2): how many nights, and how many said
 * yes, maybe and no. An answer with a wrong value counts nowhere (case 13).
 *
 * Inputs: option — its two days; answers — member id to answer, for this
 * option only (may be empty).
 * Output: { nights, yes, maybe, no }.
 * Examples (tests in dates.test.ts):
 *   13–23 Feb, 2 yes, 1 maybe, 1 no   → { nights: 10, yes: 2, maybe: 1, no: 1 }
 *   an answer of "perhaps"            → not counted
 */
export function summary(option: DateOption, answers: Record<MemberId, Answer> = {}): OptionSummary {
  const counts = { nights: nights(option.from, option.to), yes: 0, maybe: 0, no: 0 };
  for (const answer of Object.values(answers)) if (isAnswer(answer)) counts[answer] += 1;
  return counts;
}

/**
 * The option that carries "Most yes" (20/2), so the crew sees where the
 * votes lean. A tie, or no yes at all, marks nothing (case 6 of Trip 7).
 *
 * Inputs: options — id to option; answers — option id to its answers.
 * Answers for an option that no longer exists are ignored (case 13).
 * Output: the option id, or null.
 * Examples (tests in dates.test.ts):
 *   a: 2 yes, b: 1 yes  → "a"
 *   a: 1 yes, b: 1 yes  → null
 */
export function mostYes(options: Record<string, DateOption>, answers: Record<string, Record<MemberId, Answer>> = {}): string | null {
  let best: string | null = null;
  let bestCount = 0;
  let tied = false;
  for (const id of Object.keys(options)) {
    const count = summary(options[id], answers[id]).yes;
    if (count > bestCount) [best, bestCount, tied] = [id, count, false];
    else if (count === bestCount && count > 0) tied = true;
  }
  return tied ? null : best;
}

/**
 * Who has not answered any date option yet: members who replied, then the
 * expected friends who have not replied at all. A friend who can't make it
 * is not asked (case 8). The organizer reads it as "3 have not answered".
 *
 * Inputs: expected — id to name from the trip file; members — who replied;
 * options and answers, as for mostYes().
 * Output: { id, name } in that order.
 * Examples (tests in dates.test.ts):
 *   JD answered, SN did not, LC never replied  → [SN, LC]
 *   RB can't make it                           → []
 */
export function notAnswered(
  expected: Record<MemberId, string>,
  members: Record<MemberId, Member>,
  options: Record<string, DateOption>,
  answers: Record<string, Record<MemberId, Answer>> = {},
): Array<{ id: MemberId; name: string }> {
  const answered = (id: MemberId) => Object.keys(options).some((optionId) => isAnswer(answers[optionId]?.[id]));
  const fromMembers = Object.entries(members)
    .filter(([id, member]) => member.reply !== "out" && !answered(id))
    .map(([id, member]) => ({ id, name: member.name }));
  const fromExpected = Object.entries(expected)
    .filter(([id]) => members[id] === undefined)
    .map(([id, name]) => ({ id, name }));
  return [...fromMembers, ...fromExpected];
}

/**
 * Checks the two days of "Add dates" before anything is written, and says
 * what is wrong next to the field that is wrong, so the typed days stay.
 *
 * Inputs: draft — the two fields as typed, "YYYY-MM-DD" or empty. Any day
 * may be picked (owner, 24 Nov 2026: "no restrictions").
 * Output: a reason per wrong field; empty when the dates can be added.
 * Examples (tests in dates.test.ts):
 *   13–23 Feb        → {}
 *   To 10 Feb, From 13 Feb → { to: "Pick a day on or after From." }
 */
export function checkDates(draft: { from: string; to: string }): Partial<Record<"from" | "to", string>> {
  const real = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day);
  const found: Partial<Record<"from" | "to", string>> = {};
  if (!real(draft.from)) found.from = "Pick a day.";
  if (!real(draft.to)) found.to = "Pick a day.";
  else if (!found.from && draft.to < draft.from) found.to = "Pick a day on or after From.";
  return found;
}
