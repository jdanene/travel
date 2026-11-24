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
  /** The line under the name on the invitation (screen 1). */
  summary?: string;
  note?: string;
  noteBy?: string;
  season: { from: string; to: string };
  /** The day every date option includes: the Full Moon Party, 2027-02-22. */
  anchor: { name: string; date: string };
  /** Each destination with its centre on the map. */
  destinations: Record<DestinationId, { name: string; lat?: number; lng?: number }>;
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

/** A day of the week, as a weekly show stores it. */
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface Show {
  destination: DestinationId;
  venue: string;
  area?: string;
  /** The first night; for a weekly show, its first one in the season. */
  date: string;
  /** Present on a show that repeats every week on this day ("Every Sunday"). */
  weekly?: Weekday;
  artist: string;
  /** One plain line that says what the event is. */
  about?: string;
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

export interface LinkItem {
  url: string;
  site: "instagram" | "tiktok" | "other";
  destination: DestinationId;
  note?: string;
  title?: string;
  thumbUrl?: string;
  addedBy: MemberId;
  at: number;
}

export interface Links {
  items?: Record<string, LinkItem>;
}

export interface Area {
  name: string;
  destination: DestinationId;
  lat: number;
  lng: number;
}

export interface Venue {
  name: string;
  destination: DestinationId;
  /** Absent when the lineup names no area (Lost Jungle). */
  areaId?: string;
  lat: number;
  lng: number;
  /** A short line under the name on the map card: "Club on the cliffs". */
  line?: string;
  /** false when the venue is not on OpenStreetMap and sits at its area's centre. */
  onMap?: boolean;
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
  links?: Links;
  places?: Places;
}
