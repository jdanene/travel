// The clubs whose own sites the events check reads, one source per club.
// This file is the only place that names them, and their hosts are the
// only hosts the check opens. It does not fetch anything.
//
// A source names the club as the trip's lists name it (data/places.json),
// its destination and area, the page that lists its events, and, when the
// events sit one to a page, the shape of a link to such a page.
//
// Checked from a Mac on 23 Nov 2026, each club's own events page. Only a
// page that publishes schema.org Event data can be read, so only Savaya,
// Illuzion Phuket and Zouk are listed. The rest, with the reason, are in
// README.md: in Bali and Koh Phangan, Atlas Beach Club, Atlas Super Club,
// Klymax, Potato Head, Desa Kitsuné, Café del Mar Bali, Single Fin, the
// Full Moon Party, the Half Moon Festival, Jungle Experience, Waterfall
// Party, Hidden Paradise and Lost Jungle; in Phuket, Café del Mar Phuket,
// Maya Beach Club, XANA Beach Club, Yona Beach Club, Armania Phuket and
// Baba Beach Club; in Singapore, Marquee and CÉ LA VI.

import { plainHttps } from "./sites.mjs";

export const SOURCES = [
  {
    venue: "Savaya",
    destination: "bali",
    area: "Uluwatu",
    // The calendar has no event data of its own; each night's page has one
    // Event, and the calendar links to the nights by date.
    url: "https://www.savaya.com/event-calendar",
    eventPages: /^\/event-calendar\/[a-z]+-\d{1,2}-\d{4}$/,
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
];

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
