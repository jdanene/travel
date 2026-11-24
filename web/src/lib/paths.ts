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

/** The member this device points to: crew/devices/{uid}. */
export const device = (tripId: string, uid: string) => `trips/${tripId}/crew/devices/${uid}`;

/** One member's name and reply. */
export const member = (tripId: string, memberId: string) => `trips/${tripId}/crew/members/${memberId}`;

/** This device's organizer mark. */
export const organizer = (tripId: string, uid: string) => `trips/${tripId}/crew/organizers/${uid}`;

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
