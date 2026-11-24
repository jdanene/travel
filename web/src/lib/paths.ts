/**
 * Every database path the app reads or writes, one function each. No other
 * file builds a path from strings; database.rules.json repeats these paths,
 * and the rules tests use these functions so the two cannot drift apart.
 *
 * Ids are passed through as they are. Callers make ids with the features'
 * own rules (a member id from a name, a stay id from a listing address), so
 * an id never holds ".", "#", "$", "[", "]" or "/".
 */

/** The whole trip, read by the one listener. */
export const trip = (tripId: string) => `trips/${tripId}`;

/** The invite title in the link preview; only an organizer writes it. */
export const inviteTitle = (tripId: string) => `trips/${tripId}/info/inviteTitle`;

/** The member this device points to: crew/devices/{uid}. */
export const device = (tripId: string, uid: string) => `trips/${tripId}/crew/devices/${uid}`;

/** One member's name and reply. */
export const member = (tripId: string, memberId: string) => `trips/${tripId}/crew/members/${memberId}`;

/** One field of a member: written alone, so a new reply keeps the photo and a new photo keeps the reply. */
export const memberField = (tripId: string, memberId: string, field: "name" | "reply" | "at" | "photo") =>
  `trips/${tripId}/crew/members/${memberId}/${field}`;

/** This device's organizer mark. */
export const organizer = (tripId: string, uid: string) => `trips/${tripId}/crew/organizers/${uid}`;

/** One organizer key; an organizer adds one, and no phone can read it back. */
export const organizerKey = (tripId: string, key: string) => `tripSecrets/${tripId}/organizerKey/${key}`;

/** This device's claim on the organizer key; no phone can read it back. */
export const organizerClaim = (tripId: string, uid: string) => `tripSecrets/${tripId}/claims/${uid}`;

/** One date option. */
export const dateOption = (tripId: string, optionId: string) => `trips/${tripId}/dates/options/${optionId}`;

/** Every answer to one date option; removed with the option. */
export const optionAnswers = (tripId: string, optionId: string) => `trips/${tripId}/dates/answers/${optionId}`;

/** A member's answer to one date option. */
export const answer = (tripId: string, optionId: string, memberId: string) =>
  `trips/${tripId}/dates/answers/${optionId}/${memberId}`;

/** The confirmed date option. */
export const datesConfirmed = (tripId: string) => `trips/${tripId}/dates/confirmed`;

/** One stay option. */
export const stayOption = (tripId: string, stayId: string) => `trips/${tripId}/stay/options/${stayId}`;

/** A member's heart on one stay option. */
export const heart = (tripId: string, stayId: string, memberId: string) =>
  `trips/${tripId}/stay/hearts/${stayId}/${memberId}`;

/** The confirmed stay of one destination. */
export const stayConfirmed = (tripId: string, destination: string) =>
  `trips/${tripId}/stay/confirmed/${destination}`;

/** One show. */
export const show = (tripId: string, showId: string) => `trips/${tripId}/parties/shows/${showId}`;

/** When the events check last ran, and who claimed it. */
export const lastCheck = (tripId: string) => `trips/${tripId}/parties/lastCheck`;

/** Every "in" mark on one show; removed with the show. */
export const showIn = (tripId: string, showId: string) => `trips/${tripId}/parties/in/${showId}`;

/** A member's "in" mark on one show. */
export const inMark = (tripId: string, showId: string, memberId: string) =>
  `trips/${tripId}/parties/in/${showId}/${memberId}`;

/** One saved link. */
export const link = (tripId: string, linkId: string) => `trips/${tripId}/links/items/${linkId}`;

/** One place a friend put on the map. */
export const customPlace = (tripId: string, placeId: string) => `trips/${tripId}/places/custom/${placeId}`;

/** One member's phone for trip texts: { e164, at }. Its own device writes it; an organizer reads them all. */
export const phone = (tripId: string, memberId: string) => `tripSecrets/${tripId}/phones/${memberId}`;

/** Every member's phone, for the organizer's "Text the crew" count. */
export const phones = (tripId: string) => `tripSecrets/${tripId}/phones`;

/** The trip's text count for one day (yyyy-mm-dd, UTC); the sender (services/travel-texts) adds one per text sent. */
export const textLog = (tripId: string, day: string) => `tripSecrets/${tripId}/textLog/${day}`;

/** One tag on one event; any member adds or removes it. */
export const showTag = (tripId: string, showId: string, tag: string) => `trips/${tripId}/parties/showTags/${showId}/${tag}`;

/** Every tag on one event; removed with the event. */
export const showTags = (tripId: string, showId: string) => `trips/${tripId}/parties/showTags/${showId}`;

/** A tag's name; any member makes a new one, and it never changes. */
export const tagName = (tripId: string, tag: string) => `trips/${tripId}/places/tagNames/${tag}`;

/** Every activity line, for the push() that makes a new id. */
export const activity = (tripId: string) => `trips/${tripId}/activity`;

/** One activity line: an automatic line, a post or a poll. */
export const activityEntry = (tripId: string, id: string) => `trips/${tripId}/activity/${id}`;

/** Every vote on one poll; removed with the poll. */
export const activityVotes = (tripId: string, id: string) => `trips/${tripId}/activityVotes/${id}`;

/** A member's vote on one poll: the option's index. */
export const activityVote = (tripId: string, id: string, memberId: string) => `trips/${tripId}/activityVotes/${id}/${memberId}`;

/** Every reply under one post or poll; removed with it. */
export const activityReplies = (tripId: string, id: string) => `trips/${tripId}/activityReplies/${id}`;

/** One reply under a post or a poll. */
export const activityReply = (tripId: string, id: string, replyId: string) => `trips/${tripId}/activityReplies/${id}/${replyId}`;

/** Every emoji on one Feed line; removed with a deleted post. */
export const activityReactions = (tripId: string, id: string) => `trips/${tripId}/activityReactions/${id}`;

/** One emoji a member put on a Feed line; a member may put several. The key is reactions.ts's reactionKey(). */
export const activityReaction = (tripId: string, id: string, memberId: string, key: string) => `trips/${tripId}/activityReactions/${id}/${memberId}/${key}`;
