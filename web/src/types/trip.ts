/**
 * The shape of one trip in the Realtime Database: /trips/{tripId}.
 * Section 4 of docs/trip-app/plan.md is the contract; database.rules.json
 * enforces it. Every branch is optional, because a half-written trip must
 * still load (edge case 9): each block shows its empty state instead.
 *
 * Maps keyed by id are plain records, because that is how the database
 * returns them.
 */

export type MemberId = string;
export type Uid = string;
export type DestinationId = string;

/** A member's reply to the invitation: "I'm in", "Maybe", "Can't make it". */
export type Reply = "in" | "maybe" | "out";

/** A member's answer to one date option. */
export type Answer = "yes" | "maybe" | "no";

export interface TripInfo {
  name: string;
  note?: string;
  noteBy?: string;
  season: { from: string; to: string };
  destinations: Record<DestinationId, { name: string }>;
}

export interface Member {
  name: string;
  reply: Reply;
  at: number;
}

export interface Crew {
  expected?: Record<MemberId, string>;
  members?: Record<MemberId, Member>;
  devices?: Record<Uid, MemberId>;
  organizers?: Record<Uid, true>;
}

/** A settled choice: what was picked, by which member, and when. */
export interface Confirmation {
  by: MemberId;
  at: number;
}

export interface DateOption {
  from: string;
  to: string;
}

export interface Dates {
  options?: Record<string, DateOption>;
  answers?: Record<string, Record<MemberId, Answer>>;
  confirmed?: Confirmation & { optionId: string };
}

export interface StayOption {
  destination: DestinationId;
  url: string;
  name: string;
  area: string;
  sleeps?: number;
  photoUrl?: string;
  addedBy: MemberId;
  at: number;
}

export interface Stay {
  options?: Record<string, StayOption>;
  hearts?: Record<string, Record<MemberId, true>>;
  confirmed?: Record<DestinationId, Confirmation & { stayId: string }>;
}

export interface Show {
  destination: DestinationId;
  venue: string;
  area?: string;
  date: string;
  artist: string;
  link?: string;
  verified: boolean;
  source: "seed" | "friend";
  addedBy?: MemberId;
  at: number;
}

export interface LastYearShow {
  destination: DestinationId;
  venue: string;
  date: string;
  artist: string;
}

export interface Parties {
  shows?: Record<string, Show>;
  lastYear?: Record<string, LastYearShow>;
  in?: Record<string, Record<MemberId, true>>;
}

export interface Area {
  name: string;
  destination: DestinationId;
  lat: number;
  lng: number;
}

export interface Venue {
  name: string;
  areaId: string;
  lat: number;
  lng: number;
  line?: string;
}

export interface Places {
  areas?: Record<string, Area>;
  venues?: Record<string, Venue>;
}

export interface Trip {
  info?: TripInfo;
  crew?: Crew;
  dates?: Dates;
  stay?: Stay;
  parties?: Parties;
  places?: Places;
}
