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
  /** The name in the link preview, set by an organizer (the "Invite" sheet); absent means DEFAULT_INVITE_TITLE (lib/invite.ts). */
  inviteTitle?: string;
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
  /** The member's own photo: a 160 px JPEG data URL; absent means initials. */
  photo?: string;
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

/** One range of days the crew votes on. The organizer's starting options have no adder. */
export interface DateOption {
  from: string;
  to: string;
  /** The member who added it with "Add dates". */
  addedBy?: MemberId;
  at?: number;
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
  /** "check" is a show the events check found on the club's own page; nobody added it. */
  source: "seed" | "friend" | "check";
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
  /** When the events check last ran, and the member whose device claimed it. */
  lastCheck?: { at: number; by: MemberId };
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
  /** true for one of the owner's big nights (data/places.json); create-trip seeds it as the "big" tag (places/tags). */
  big?: boolean;
}

/** What a friend's place on the map is; each has its own pin icon. */
export type PlaceKind = "event" | "food" | "beach" | "activity" | "other";

/** A place a friend put on the map ("Add to map"); everyone sees it. No edits. */
export interface CustomPlace {
  name: string;
  kind: PlaceKind;
  destination: DestinationId;
  lat: number;
  lng: number;
  link?: string;
  /** At most 200 characters (Add to map, owner, 24 Nov 2026). */
  description?: string;
  /** A 640 px landscape JPEG as a data URL, at most 80 000 characters. */
  photo?: string;
  addedBy: MemberId;
  at: number;
}

export interface Places {
  areas?: Record<string, Area>;
  venues?: Record<string, Venue>;
  /** Friends' places, written from phones (places/custom). */
  custom?: Record<string, CustomPlace>;
  /** Each venue's tags, set by an organizer: { venueId: { tag: true } }. */
  tags?: Record<string, Record<string, true>>;
  /** Each tag's name: { big: "Big nights" }. */
  tagNames?: Record<string, string>;
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
