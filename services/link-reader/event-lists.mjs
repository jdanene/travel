// Readers for clubs that list their nights as plain page text, or in the
// JSON feed their page loads, instead of schema.org Event data. Each knows one club's layout, so each breaks when
// that club redesigns its page; the check then reports the club as
// "unreadable" and the other clubs still run. Pure: no network, no clock
// (the caller passes the time). event-sources.mjs names which club uses
// which reader.
//
// Every reader takes (html, pageUrl, now) and returns [{ name, date, link?, image?, startTime?, endTime? }]:
// name is the act as the club writes it, date is "YYYY-MM-DD", link,
// when the night has its own page, is that page's https address, and image,
// where the list plainly gives the night's picture, its https address
// (eventImage in parse.mjs; never fetched); startTime and endTime, where
// the list plainly states the night's time, "HH:MM" on the club's clock
// (eventTimes in parse.mjs). It returns
// null when it does not recognise the page: for a text list, no night at
// all (the layout has changed); for a feed, an answer that is not the
// feed. A feed that lists no night gives [], which is not a failure.

import { clean, dayOf, decodeEntities, eventImage, eventTimes } from "./parse.mjs";

/**
 * Café del Mar Phuket's events list: each card holds the date three times,
 * first as M/D/YYYY, then as D/M/YYYY twice, then "|", the start time
 * ("10:00 pm") and the stage, then the act in capitals, linked to /events/<slug>.
 *
 * Examples (fixtures/cafe-del-mar-phuket-events.html; events.test.mjs runs it):
 *   → 29 nights from 25 Nov 2026 to 31 May 2027, each with its start, among them
 *     { name: "CARL COX B2B NIC FANCIULLI", date: "2027-01-03", link: "https://phuket.cafedelmar.com/events/carl-cox-jan2027", startTime: "14:00" }
 */
export function readCafeDelMarPhuket(html, pageUrl) {
  const nights = [];
  const card = /dataid-1"[^>]*>(\d{1,2})\/(\d{1,2})\/(\d{4})<\/div>\s*<div[^>]*start-date"[^>]*>(\d{1,2})\/(\d{1,2})\/\d{4}<\/div>([\s\S]*?)<a href="(\/events\/[^"#?]+)"[^>]*>\s*<div class="artist-name">([^<]+)<\/div>/g;
  for (const [, month, day, year, day2, month2, between, path, name] of html.matchAll(card)) {
    // The two spellings of the date must agree, or the layout has changed.
    if (month !== month2 || day !== day2) continue;
    const time = between.match(/>\|<\/div>\s*<div[^>]*>([^<]+)</)?.[1];
    nights.push(night(name, `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`, path, pageUrl, undefined, eventTimes(time)));
  }
  return found(nights);
}

/**
 * CÉ LA VI Singapore's home page highlights: each card holds the date as
 * YYYY-MM-DD, the room ("Club Lounge", "Sky Bar", "Restaurant") and the
 * event's name, linked to /events/<slug>, with its featured picture. Only
 * the Club Lounge counts: the other rooms hold dinners and bar takeovers.
 *
 * Examples (fixtures/ce-la-vi-home.html):
 *   → 3 Club Lounge nights from 28 Nov to 31 Dec 2026, the first
 *     { name: "CÉ LA VI Pres. Fabio Neural", date: "2026-11-28", link: "https://sg.celavi.com/events/ce-la-vi-pres-fabio-neural",
 *       image: "https://cdn.prod.website-files.com/…/6ae85e966bf9155e11c415f7_Fabio%20Neural_28Nov%2726_Web.jpg" }
 */
export function readCeLaVi(html, pageUrl) {
  const nights = [];
  for (const item of html.split(/role="listitem"/).slice(1)) {
    const path = item.match(/href="(\/events\/[^"#?]+)"/)?.[1];
    const date = item.match(/fs-list-field="eventdate"[^>]*>(\d{4}-\d{2}-\d{2})</)?.[1];
    const room = item.match(/eventdate"[^>]*>[^<]*<\/div>\s*<div[^>]*>\s*<div[^>]*>([^<]+)</)?.[1];
    const name = item.match(/<h3[^>]*>([^<]+)<\/h3>/)?.[1];
    const image = eventImage(item.match(/<img\b[^>]*\bsrc="([^"]+)"[^>]*class="eventnew_featuredimg"/)?.[1], pageUrl);
    if (path && date && name && clean(room) === "Club Lounge") nights.push(night(name, date, path, pageUrl, image));
  }
  return found(nights);
}

/**
 * Klymax's "THIS WEEK": the night's date as "Friday, 27 November 2026" and
 * its acts in one line. It shows one night, a week ahead at most.
 *
 * Examples (fixtures/klymax-home.html):
 *   → [{ name: "Cloud of Kouros., Slip D., Pete Santos", date: "2026-11-27" }]
 */
export function readKlymax(html) {
  const nights = [];
  for (const [, when, acts] of html.matchAll(/<h3[^>]*>((?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day, \d{1,2} [A-Za-z]+ \d{4})<\/h3>[\s\S]{0,400}?<h2[^>]*>([^<]+)<\/h2>/g)) {
    nights.push(night(acts, dayOf(when)));
  }
  return found(nights);
}

/**
 * Café del Mar Bali's "What's on": each card gives the date as
 * "31 December 2026" and the event's name; its picture is the <img>
 * whose alt text is that name. Past events follow in the same shape; the
 * check's season leaves them out.
 *
 * Examples (fixtures/cafe-del-mar-bali-whats-on.html):
 *   → 18 nights from 1 May 2023 to 31 Dec 2026, among them
 *     { name: "NEW YEARS EVE 2026", date: "2026-12-31", image: "https://www.cafedelmarbali.co.id/reserve/assets/images/events/event_square_1792567873_6ad86a41d5753.jpg" }
 */
export function readCafeDelMarBali(html, pageUrl) {
  const pictures = new Map();
  for (const [, src, alt] of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*\balt="([^"]+)"/g)) {
    const name = clean(decodeEntities(alt));
    if (name && !pictures.has(name)) pictures.set(name, src);
  }
  const nights = [];
  for (const [, when, name] of html.matchAll(/<span[^>]*>\s*(\d{1,2} [A-Za-z]+ \d{4})\s*<\/span>\s*<h3[^>]*>([^<]+)<\/h3>/g)) {
    nights.push(night(name, dayOf(when), undefined, pageUrl, eventImage(pictures.get(clean(decodeEntities(name)) ?? ""), pageUrl)));
  }
  return found(nights);
}

/**
 * Desa Kitsuné's events: the weekday, then the day and month with no year
 * ("Thu", ",", "26 Nov"), then the event's name. The year is the one, from
 * last month to eleven months ahead, in which that day falls on that
 * weekday; a day that fits no year is skipped.
 *
 * Inputs: now, the check's time, which fixes the year.
 * Examples (fixtures/desa-kitsune-events.html, now 23 Nov 2026):
 *   → [{ name: "FRIENDSGIVING", date: "2026-11-26" }, { name: "INA RÉ 2ND ANNIVERSARY", date: "2026-12-03" },
 *      { name: "ÂME DJ", date: "2026-12-31" }]
 */
export function readDesaKitsune(html, pageUrl, now) {
  const lines = textLines(html);
  const nights = [];
  for (let i = 0; i + 3 < lines.length; i++) {
    const weekday = lines[i].match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*$/i)?.[1];
    const dayMonth = lines[i + 2].match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]*$/);
    if (!weekday || lines[i + 1] !== "," || !dayMonth) continue;
    const date = yearFor(dayMonth[1], dayMonth[2], weekday, now);
    if (date) nights.push(night(lines[i + 3], date));
  }
  return found(nights);
}

/**
 * The Full Moon Party's schedule: one row per party, "February 22nd 2027
 * (Mon/Tue)". The party is the act.
 *
 * Examples (fixtures/full-moon-party-schedules.html):
 *   → 16 rows from 24 Nov 2026 to 31 Dec 2027, among them { name: "Full Moon Party", date: "2027-02-22" }
 *     (the two 31 December rows are the New Year party; the season leaves them out)
 */
export function readFullMoonParty(html) {
  const nights = [];
  for (const line of textLines(html)) {
    const row = line.match(/^([A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th) \d{4}) \((?:[A-Z][a-z]{2}\/[A-Z][a-z]{2})\)/);
    if (row) nights.push(night("Full Moon Party", dayOf(row[1])));
  }
  return found(nights);
}

/**
 * Potato Head's events feed, the JSON its "What's on" page loads
 * (/api/cached/experiences?type=Event&categories=music): music events from
 * today to six months ahead, each with a title, its days, a slug, its
 * picture (Image, else Thumbnail), and its start and end times.
 *
 * Examples (fixtures/potato-head-music.json):
 *   → [{ name: "Live at Klymax: OFFSCRIPT", date: "2026-12-11", link: "https://seminyak.potatohead.co/experience/live-at-klymax-offscript",
 *        image: "https://cdn.potatohead.co/139_KLYMAX_OFFSCRIPT_LIVE_AT_KLYMAX_AUG_2026_1920x1080_WEB_4_dd0f32d092.jpg", startTime: "21:00", endTime: "03:00" },
 *      { name: "NYE 2026", date: "2026-12-31", link: "https://seminyak.potatohead.co/experience/new-years-eve",
 *        image: "https://cdn.potatohead.co/New_Year_Eve_NYE_2026_Potato_Head_16x9_65b55abc14.jpg", startTime: "16:00", endTime: "02:00" }]
 */
export function readPotatoHead(text, pageUrl) {
  return feed(text, "data")?.map((item) => {
    const when = item?.Schedule?.[0];
    const date = dayOf(String(when?.dates?.[0] ?? ""));
    // Its first and last day with its clocks, so the next-day rule can check the end.
    const at = (day, clock) => (typeof clock === "string" ? `${dayOf(String(day ?? "")) ?? ""}T${clock}` : undefined);
    const times = eventTimes(at(when?.dates?.[0], when?.startTime), at(when?.dates?.at?.(-1), when?.endTime));
    return night(item?.Title, date, item?.Slug && `/experience/${encodeURIComponent(item.Slug)}`, pageUrl, eventImage(item?.Image?.url ?? item?.Thumbnail?.url, pageUrl), times);
  }).filter(Boolean) ?? null;
}

/**
 * Marquee Singapore's events feed, the WordPress JSON its events page loads
 * (taogroup.com/wp-json/wp/v2/events for venue 824, from a start day on),
 * each with a display title, a start as "11/27/2026 10:00 pm" (month
 * first; its time is the night's start) and its page.
 *
 * Examples (fixtures/marquee-events.json, from 23 Nov 2026; an empty feed is [],
 * and an answer that is not a list is null):
 *   → 11 nights from 27 Nov to 31 Dec 2026, the first
 *     { name: "HOLY PRIEST", date: "2026-11-27", link: "https://taogroup.com/event/27-11-26-holy-priest-marquee-singapore/", startTime: "22:00" }
 */
export function readMarquee(text, pageUrl) {
  return feed(text)?.map((item) => {
    const start = String(item?.acf?.event_start_date ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const date = start && dayOf(`${start[3]}-${start[1].padStart(2, "0")}-${start[2].padStart(2, "0")}`);
    const link = typeof item?.link === "string" && item.link.startsWith("https://taogroup.com/") ? item.link : undefined;
    return night(item?.acf?.event_title?.display_title, date, link, pageUrl, undefined, eventTimes(item?.acf?.event_start_date));
  }).filter(Boolean) ?? null;
}

/**
 * Savaya's start time for one night, from that night's own page: its Event
 * data gives the day alone ("Jan 30, 2027"), but the page states, under the
 * date, "Doors Open at" and then the time ("3:00 pm"), two text blocks side
 * by side. Only that pair counts: the footer's opening hours ("Saturday:
 * 3:00PM - Close") are the venue's, not the night's, and give nothing. The
 * page names no end.
 *
 * Inputs: html, the night's page as fetched.
 * Output: { startTime } ("HH:MM", eventTimes in parse.mjs), or {} when the
 * page has no such pair or its time cannot be read.
 * Examples (each is a test in event-lists.test.mjs):
 *   readDoorsOpen(<fixtures/savaya-hugel-event.html>) → { startTime: "15:00" }
 *   readDoorsOpen(<fixtures/savaya-event.html>)       → {}   (the trimmed page keeps no such text)
 */
export function readDoorsOpen(html) {
  const time = html.match(/>\s*Doors Open at\s*<\/div>\s*<div[^>]*>\s*([^<]{1,20}?)\s*</i)?.[1];
  return time ? eventTimes(decodeEntities(time)) : {};
}

// The list in a JSON answer (at key, when given), or null for anything else.
function feed(text, key) {
  try {
    const value = JSON.parse(text);
    const list = key ? value?.[key] : value;
    return Array.isArray(list) ? list : null;
  } catch {
    return null;
  }
}

// The nights a text list gave, or null when it gave none.
function found(nights) {
  const real = nights.filter(Boolean);
  return real.length ? real : null;
}

// One night, or null when the name or the date is missing; its picture and times only when there are some.
function night(name, date, path, pageUrl, image, times = {}) {
  const text = clean(decodeEntities(name ?? ""));
  if (!text || !date) return null;
  const pic = { ...(image ? { image } : {}), ...times };
  if (!path) return { name: text, date, ...pic };
  const link = new URL(path, pageUrl);
  link.protocol = "https:";
  return { name: text, date, link: link.toString(), ...pic };
}

// The page's visible text, one line per block, without scripts and styles.
function textLines(html) {
  return decodeEntities(html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, "\n"))
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// "YYYY-MM-DD" for a day and month with no year, from the weekday it falls on.
function yearFor(day, month, weekday, now) {
  const m = MONTHS.indexOf(month.toLowerCase());
  const w = WEEKDAYS.indexOf(weekday.slice(0, 3).toLowerCase());
  const from = now - 31 * 86_400_000;
  const to = now + 335 * 86_400_000;
  for (const year of [new Date(now).getUTCFullYear(), new Date(now).getUTCFullYear() + 1]) {
    const at = Date.UTC(year, m, Number(day));
    const date = new Date(at);
    if (m >= 0 && date.getUTCDate() === Number(day) && date.getUTCDay() === w && at >= from && at <= to) return date.toISOString().slice(0, 10);
  }
  return null;
}
