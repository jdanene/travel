// The clubs whose own sites the events check reads, one source per club.
// This file is the only place that names them, and their hosts are the
// only hosts the check opens. It does not fetch anything.
//
// A source names the club as the trip's lists name it (data/places.json),
// its destination and area, the page that lists its events, and, when the
// events sit one to a page, the shape of a link to such a page.
//
// A club whose page carries schema.org Event data needs no more. A club
// that lists its nights as plain text names its reader in event-lists.mjs
// (list). A club whose names carry a subtitle after the act ("MAHMUT ORHAN |
// SEASON OPENING 2026") names the rule that keeps the act (actName). A club
// whose one-night pages state the night's time as text, not in the Event
// data, names the reader of that time (nightTime).
// Checked from a Mac on 23 Nov 2026; README.md lists every club in
// data/places.json, what its page showed, and why a club is not read.

import { plainHttps } from "./sites.mjs";
import { readCafeDelMarBali, readCafeDelMarPhuket, readCeLaVi, readDesaKitsune, readDoorsOpen, readFullMoonParty, readKlymax, readMarquee, readPotatoHead } from "./event-lists.mjs";

export const SOURCES = [
  {
    venue: "Savaya",
    destination: "bali",
    area: "Uluwatu",
    // The calendar has no event data of its own; each night's page has one
    // Event, and the calendar links to the nights by date.
    url: "https://www.savaya.com/event-calendar",
    eventPages: /^\/event-calendar\/[a-z]+-\d{1,2}-\d{4}$/,
    // Its Event data has no time; the night's page says "Doors Open at 3:00 pm".
    nightTime: readDoorsOpen,
  },
  {
    venue: "Illuzion Phuket",
    destination: "phuket",
    area: "Patong",
    // The list of coming nights carries one Event per night.
    url: "https://www.illuzionphuket.com/events/list/",
  },
  {
    venue: "Zouk",
    destination: "singapore",
    area: "Clarke Quay",
    // One Event per night, but only for the next ten or so nights, so a
    // February or March act shows up about a week before it plays.
    url: "https://zoukgroup.com/singapore/events/",
  },
  { venue: "Café del Mar Phuket", destination: "phuket", area: "Kamala", url: "https://phuket.cafedelmar.com/events", list: readCafeDelMarPhuket },
  // The home page's highlights; sg.celavi.com/events answers 404.
  { venue: "CÉ LA VI", destination: "singapore", area: "Marina Bay", url: "https://sg.celavi.com/", list: readCeLaVi },
  // One night only, the coming one.
  { venue: "Klymax", destination: "bali", area: "Seminyak", url: "https://klymax.co/", list: readKlymax },
  { venue: "Café del Mar Bali", destination: "bali", area: "Canggu", url: "https://www.cafedelmarbali.co.id/whats-on", list: readCafeDelMarBali },
  { venue: "Desa Kitsuné", destination: "bali", area: "Canggu", url: "https://desakitsune.com/events", list: readDesaKitsune },
  // The feed its "What's on" page loads, music only: from today to six months ahead.
  { venue: "Potato Head", destination: "bali", area: "Seminyak", url: "https://seminyak.potatohead.co/api/cached/experiences?type=Event&categories=music", list: readPotatoHead },
  // The feed its events page loads, for nights from 1 Feb 2027 (00:00 in Singapore) on.
  {
    venue: "Marquee",
    destination: "singapore",
    area: "Marina Bay",
    url: "https://taogroup.com/wp-json/wp/v2/events?event_venue%5B%5D=824&filter%5Bmeta_key%5D=event_start_date&filter%5Bmeta_compare%5D=%3E%3D&filter%5Bmeta_value%5D=1801411200000&filter%5Borderby%5D=meta_value&filter%5Border%5D=asc&per_page=60&_fields=link,acf.event_title,acf.event_start_date",
    list: readMarquee,
  },
  // The party's schedule site; the seed names the venue Haad Rin Beach.
  { venue: "Haad Rin Beach", destination: "kohPhangan", area: "Haad Rin", url: "https://fullmoonparty-thailand.com/schedules/", list: readFullMoonParty },
  // One Event per coming night (/events answers with a redirect to /events/). Names carry a
  // subtitle: "MINISTRY OF SOUND | NEW YEAR’S EVE".
  { venue: "CLUB SEEN", destination: "kohSamui", area: "Chaweng", url: "https://www.seenbeachclubsamui.com/events/", actName: actBeforeBar },
];

/**
 * The act in a night's name that adds a subtitle after a bar, so the list
 * reads "MAHMUT ORHAN", and the same act on two nights counts as one name.
 *
 * Inputs: name, the night's name as read, entities decoded.
 * Output: the words before the first "|", trimmed; the whole name when
 *   there is no bar or nothing before it.
 * Examples (each is a test in events.test.mjs):
 *   actBeforeBar("MAHMUT ORHAN | SEASON OPENING 2026") → "MAHMUT ORHAN"
 *   actBeforeBar("AFRODISE")                           → "AFRODISE"
 *   actBeforeBar("| NEW YEAR’S EVE")                   → "| NEW YEAR’S EVE"   (no act before the bar)
 */
export function actBeforeBar(name) {
  const act = name.split("|")[0].trim();
  return act || name;
}

/**
 * Says whether the check may open an address for a source: the source's own
 * host, over https, and nothing else. Every page and every redirect is asked.
 *
 * Inputs: source, one of SOURCES; address, an absolute address.
 * Output: true or false.
 * Examples (checked through events.test.mjs):
 *   onSourceSite(savaya, "https://www.savaya.com/event-calendar/february-13-2027") → true
 *   onSourceSite(savaya, "http://www.savaya.com/event-calendar")                   → false (not https)
 *   onSourceSite(savaya, "https://whatsform.com/ek7dt5")                           → false
 */
export function onSourceSite(source, address) {
  return plainHttps(address)?.hostname === new URL(source.url).hostname;
}
