import { dayRange } from "../../lib/format";
import type { MemberId, Reply, Trip } from "../../types/trip";

/** One friend in "The crew" sheet: who, and the small line under the name. */
export interface CrewRow {
  id: MemberId;
  name: string;
  /** "organizer · 13–23 Feb · 4 events", "maybe · 15–25 Feb", "not replied yet". */
  line: string;
}

export interface CrewList {
  in: CrewRow[];
  maybe: CrewRow[];
  out: CrewRow[];
  notReplied: CrewRow[];
}

/**
 * Sorts the crew into the four groups of mock 5's crew sheet (IN, MAYBE,
 * CAN'T, NOT REPLIED), each in reply order, with the small line under each
 * name. It joins three contexts (crew, dates, events), so the shell holds it.
 *
 * Inputs: the trip.
 * Output: the four groups. A member's days are the confirmed dates when
 * they said yes to them, else the first option they said yes to; none when
 * they said yes to nothing. Events count the shows they are in for.
 * Examples (checked on screen against mock 5's "After See the crew"):
 *   Dom, an organizer, yes to the confirmed 13–23 Feb, in for 4 → in: "organizer · 13–23 Feb · 4 events"
 *   SN, maybe, yes to 15–25 Feb                                → maybe: "maybe · 15–25 Feb"
 *   AJ expected, no reply                                       → notReplied: "not replied yet"
 */
export function crewList(trip: Trip): CrewList {
  const members = trip.crew?.members ?? {};
  const devices = trip.crew?.devices ?? {};
  const organizers = new Set(Object.keys(trip.crew?.organizers ?? {}).map((uid) => devices[uid]));
  const options = trip.dates?.options ?? {};
  const answers = trip.dates?.answers ?? {};
  const confirmed = trip.dates?.confirmed?.optionId;
  const marks = trip.parties?.in ?? {};

  const daysOf = (id: MemberId) => {
    const yes = (optionId: string) => answers[optionId]?.[id] === "yes" && options[optionId];
    const pick = confirmed && yes(confirmed) ? confirmed : Object.keys(options).filter(yes).sort((a, b) => options[a].from.localeCompare(options[b].from))[0];
    return pick ? dayRange(options[pick].from, options[pick].to) : null;
  };
  const eventsOf = (id: MemberId) => {
    const n = Object.values(marks).filter((who) => who[id]).length;
    return n ? `${n} ${n === 1 ? "event" : "events"}` : null;
  };
  const lineOf = (id: MemberId, reply: Reply) => {
    const parts =
      reply === "in"
        ? [organizers.has(id) ? "organizer" : null, daysOf(id), eventsOf(id)]
        : reply === "maybe"
          ? ["maybe", daysOf(id)]
          : ["can't make it"];
    return parts.filter(Boolean).join(" · ");
  };

  const list: CrewList = { in: [], maybe: [], out: [], notReplied: [] };
  for (const [id, member] of Object.entries(members).sort(([, a], [, b]) => a.at - b.at)) {
    list[member.reply].push({ id, name: member.name, line: lineOf(id, member.reply) });
  }
  for (const [id, name] of Object.entries(trip.crew?.expected ?? {})) {
    if (!members[id]) list.notReplied.push({ id, name, line: "not replied yet" });
  }
  return list;
}

/**
 * The line beside the crew's faces in the title block: "6 in · 1 maybe ·
 * 1 not replied". Groups with nobody are left out, except "in".
 * Inputs: the crew list. Output: the parts, the first one bold on screen.
 * Examples (checked on screen): 6 in, 1 maybe, 0 can't, 1 not replied → ["6 in", "1 maybe", "1 not replied"]
 */
export function crewCounts(list: CrewList): string[] {
  return [
    `${list.in.length} in`,
    list.maybe.length ? `${list.maybe.length} maybe` : null,
    list.out.length ? `${list.out.length} can't` : null,
    list.notReplied.length ? `${list.notReplied.length} not replied` : null,
  ].filter((part): part is string => part !== null);
}
