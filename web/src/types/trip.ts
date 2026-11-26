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
  /** Each destination with its centre on the map and its country ("Indonesia"); the country may be missing on an older trip. */
  destinations: Record<DestinationId, { name: string; country?: string; lat?: number; lng?: number }>;
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
  /** Set when the city is one of the trip's destinations; a place in any other city has none. */
  destination?: DestinationId;
  /** The city the friend gave (owner, 24 Nov 2026: any city); older places have only a destination. */
  city?: string;
  /** The nights the friend has in mind, as days (YYYY-MM-DD); optional. */
  from?: string;
  to?: string;
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
  /** The event's own picture (the artist or line-up flyer its club publishes): https, at most 500 characters. */
  photoUrl?: string;
  /** When the night starts, "HH:MM" on the 24-hour clock at the venue, as the club or the friend wrote it (no time zone). */
  startTime?: string;
  /** When it ends, in the same form; often the next morning ("04:00"). Never without startTime. */
  endTime?: string;
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
  /** Each event's tags: { showId: { tag: true } }; any member adds or removes one. */
  showTags?: Record<string, Record<string, true>>;
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
  /** true for one of the owner's big nights (data/places.json); seed-parties gives its events the "big" tag once, and with no event it shows under Big nights. */
  big?: boolean;
  /** The venue's picture from its own website (its link-preview image), https only; absent means no picture. */
  photoUrl?: string;
  /** The venue's own website, https only (data/places.json); absent when none could be confirmed. */
  website?: string;
  /** The venue's Instagram profile, https only, as its own website links it; absent when none could be confirmed. */
  instagram?: string;
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
  /** Each tag's name: { big: "Big nights" }. */
  tagNames?: Record<string, string>;
}

/**
 * What an activity line says. The automatic kinds are written by the action
 * they describe, in the same write; post and poll are written by a friend.
 * Hearts, date votes, tags and photos write no line (too noisy).
 */
export type ActivityKind =
  | "joined"
  | "reply-changed"
  | "dates-added"
  | "dates-confirmed"
  | "dates-changed"
  | "stay-added"
  | "stay-confirmed"
  | "event-added"
  | "event-in"
  | "link-added"
  | "place-added"
  | "event-found"
  | "post"
  | "poll";

/**
 * One line in the Activity list: trips/{tripId}/activity/{id}, id from
 * push(), so ids sort by time. Lines are never edited; a post or a poll
 * may be deleted by its author or an organizer.
 */
export interface ActivityEntry {
  kind: ActivityKind;
  /** The member who did it; absent only on "event-found" (the daily check). */
  by?: MemberId;
  at: number;
  /**
   * The words of the line, saved when it is written, so a line still reads
   * after its thing is removed: the post, the poll's question, the place's
   * name, "Peggy Gou at Savaya", or the new reply ("in", "maybe", "out").
   */
  text?: string;
  /** The id of the thing the line is about (a stay, a show, a date option…), for its thumbnail. */
  ref?: string;
  /** A poll's 2 to 4 options. */
  options?: string[];
  /** A GIF or sticker post: the picture's https address on KLIPY's media host (a post with a GIF needs no text). */
  gif?: string;
  /** The GIF's size in px, so the feed keeps its place before it loads. */
  gifW?: number;
  gifH?: number;
}

export interface Trip {
  info?: TripInfo;
  crew?: Crew;
  dates?: Dates;
  stay?: Stay;
  parties?: Parties;
  links?: Links;
  places?: Places;
  activity?: Record<string, ActivityEntry>;
  /** Each poll's votes: { entryId: { memberId: option index } }; a vote can change. */
  activityVotes?: Record<string, Record<MemberId, number>>;
  /** Replies under a post or a poll: { entryId: { replyId: reply } }. */
  activityReplies?: Record<string, Record<string, ActivityReply>>;
  /**
   * Emoji on a Feed line: { entryId: { memberId: { key: time added } } }, many per member, as on Discord.
   * The key is features/activity/lib/reactions.ts's. The first version stored { memberId: emoji }; it still reads.
   */
  activityReactions?: Record<string, ActivityReactions>;
}

/** The emoji on one Feed line, per member: { key: time added }, or one emoji string in the first version's shape. */
export type ActivityReactions = Record<MemberId, Record<string, number> | string>;

/** A reply under a feed line: words, or a GIF or sticker from KLIPY (then the words are optional). */
export interface ActivityReply {
  by: MemberId;
  at: number;
  text?: string;
  /** The picture's https address on KLIPY's media host, and its size so the thread keeps its place. */
  gif?: string;
  gifW?: number;
  gifH?: number;
}
