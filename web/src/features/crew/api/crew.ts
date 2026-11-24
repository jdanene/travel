import type { Member, MemberId, Trip } from "../../../types/trip";

export interface CrewView {
  /** This device's member, or null before the friend replies. */
  memberId: MemberId | null;
  member: Member | null;
  /** Everyone who replied, oldest reply first. */
  members: Array<{ id: MemberId } & Member>;
  expected: Record<MemberId, string>;
  /** The same members, by id, for lookups. */
  byId: Record<MemberId, Member>;
  /** Whether this device holds the organizer mark. */
  isOrganizer: boolean;
  /** The organizer's name for the flyer: the first organizer who replied, else the note's signature. */
  organizer: string | undefined;
}

/**
 * The crew's read side: who this device is, who replied, who is expected.
 * It reads the trip that useTrip holds; nothing here listens on its own.
 *
 * Inputs: trip — the whole trip, or half of it; uid — this device.
 * Output: the crew view. A device pointing at a member that has no record
 * yet (its reply is still on the way) has a memberId and no member.
 * Examples (checked on the emulator):
 *   a new device      → memberId null, member null
 *   after a reply     → memberId "rb", member { name: "RB", reply: "in", … }
 */
export function crewOf(trip: Trip, uid: string): CrewView {
  const all = trip.crew?.members ?? {};
  const devices = trip.crew?.devices ?? {};
  const memberId = devices[uid] ?? null;
  const organizerUid = Object.keys(trip.crew?.organizers ?? {}).find((id) => all[devices[id]] !== undefined);
  return {
    memberId,
    member: memberId ? (all[memberId] ?? null) : null,
    members: Object.entries(all)
      .map(([id, member]) => ({ id, ...member }))
      .sort((a, b) => a.at - b.at),
    expected: trip.crew?.expected ?? {},
    byId: all,
    isOrganizer: trip.crew?.organizers?.[uid] === true,
    organizer: organizerUid ? all[devices[organizerUid]].name : trip.info?.noteBy,
  };
}
