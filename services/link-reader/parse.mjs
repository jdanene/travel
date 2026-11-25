// Reads what a friend needs from a fetched page: a listing's name, area,
// size and photo, or a post's title and picture. Pure: no network, no clock.
// It knows the page shapes of Airbnb, Booking.com, Instagram and TikTok; which
// hosts may be fetched is sites.mjs's business, not this file's.

const MAX_TEXT = 200;

/**
 * Reads a place to stay from an Airbnb or Booking.com page, so the Add a place
 * sheet can fill in the listing for the friend.
 *
 * Inputs:
 *   html, the page as fetched (the first 512 KB is enough; the tags sit in
 *     the head).
 *   url, the address the page came from, after redirects; relative photo
 *     addresses resolve against it.
 *
 * Output: { name, photoUrl?, area?, sleeps? } when the page names the listing.
 *   photoUrl is always an absolute https address; area is the town the site
 *   names; sleeps is the number of guests. null when the page names nothing,
 *   as a challenge page or a login wall does; the caller treats that as
 *   unreadable.
 *
 * Examples (the saved pages are in fixtures/; parse.test.mjs runs each):
 *   parseListing(<fixtures/airbnb-listing.html>, "https://www.airbnb.com/rooms/1041153373514809459")
 *     → { name: "Las Palmas Uluwatu", area: "South Kuta", sleeps: 2,
 *         photoUrl: "https://a0.muscache.com/im/pictures/hosting/Hosting-1041153373514809459/original/49848837-19bf-461b-a986-d31aa73f021a.jpeg?im_w=720&width=720&quality=70&auto=webp" }
 *   parseListing('<title>Hotel</title><meta property="og:title" content="★★★★ Rin Bay View, Haad Rin, Thailand"><meta property="og:image" content="//cf.bstatic.com/x.jpg">',
 *                "https://www.booking.com/hotel/th/rin-bay-view.html")
 *     → { name: "Rin Bay View", area: "Haad Rin", photoUrl: "https://cf.bstatic.com/x.jpg" }
 *   parseListing(<fixtures/booking-challenge.html>, "https://www.booking.com/hotel/th/x.html") → null
 */
export function parseListing(html, url) {
  const page = readHead(html);
  const photoUrl = absolutePhoto(page.meta["og:image"], url);
  const host = new URL(url).hostname;
  const listing = /airbnb|abnb/.test(host) ? airbnbListing(page, html) : bookingListing(page);
  if (!listing?.name) return null;
  return withoutEmpty({ ...listing, photoUrl });
}

/**
 * Reads a post from an Instagram or TikTok page, so a saved link shows more
 * than its address.
 *
 * Inputs: html and url, as for parseListing.
 *
 * Output: { title, photoUrl? } when the page says what the post is. The title
 *   is the post's caption or the site's preview title, cut to 200 characters.
 *   null when the page says nothing, as Instagram's login wall does; the
 *   caller treats that as unreadable.
 *
 * Examples (saved pages in fixtures/):
 *   parsePost(<fixtures/tiktok-video.html>, "https://www.tiktok.com/@x/video/7391831906586807598")
 *     → { title: "🎉 Full Moon Party in Thailand: What You Need to Know 🌕",
 *         photoUrl: "https://p19-common-sign.tiktokcdn-us.com/tos-useast5-p-0068-tx/6a2c3f515bef41f9891c690ab946f3f7_1721045007~tplv-tiktokx-origin.image?x-expires=1795662000" }
 *   parsePost(<fixtures/instagram-login.html>, "https://www.instagram.com/savayabali/") → null
 *   parsePost('<meta content="Savaya on Instagram: &quot;Sunset&quot;" property="og:title"><meta property="og:image" content="http://cdn.example/p.jpg">',
 *             "https://www.instagram.com/p/abc/")
 *     → { title: 'Savaya on Instagram: "Sunset"', photoUrl: "https://cdn.example/p.jpg" }
 */
export function parsePost(html, url) {
  const page = readHead(html);
  const tiktok = tiktokItem(html);
  const title = [page.meta["og:title"], page.meta["og:description"], tiktok.desc, page.meta["twitter:title"], page.title]
    .map(clean)
    .find((t) => t && !isSiteName(t));
  if (!title) return null;
  const photo = page.meta["og:image"] || page.meta["twitter:image"] || tiktok.cover;
  return withoutEmpty({ title: cut(title), photoUrl: absolutePhoto(photo, url) });
}

// Airbnb's page title is "<name> in <area>, <region>, <country> - Airbnb",
// sometimes "<name> - Houses for Rent in <area>, …", and its og:title is
// "<type> in <area> · ★4.97 · 1 bedroom · …". The area from og:title tells
// where the name ends, even when the name itself holds " in ".
function airbnbListing(page, html) {
  const area = clean(page.meta["og:title"]?.match(/\bin ([^·]+?)\s*·/)?.[1]);
  let name = clean(page.title?.replace(/\s+-\s+Airbnb\s*$/i, ""));
  if (name && area) {
    const end = name.lastIndexOf(` in ${area}`);
    if (end > 0) name = name.slice(0, end).replace(/\s+-\s+[\w ]+ for Rent$/i, "");
  }
  if (!name || isSiteName(name)) name = clean(page.meta["og:description"]);
  const sleeps = Number(html.match(/"personCapacity":(\d{1,2})\b/)?.[1]) || undefined;
  return { name: cut(name), area, sleeps };
}

// Booking.com's og:title is "★★★★ <name>, <area>, <country>", sometimes
// without the stars or the area.
function bookingListing(page) {
  const text = clean(page.meta["og:title"] || page.title)
    ?.replace(/^[★☆*\s]+/, "")
    .replace(/\s+[-–|]\s+(Updated|Booking\.com).*$/i, "");
  if (!text || isSiteName(text)) return null;
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  return { name: cut(parts[0]), area: parts.length >= 3 ? parts[1] : undefined };
}

// TikTok sends no preview tags to a plain request, but the page carries the
// video's record as JSON: its caption ("desc") and its cover picture.
function tiktokItem(html) {
  const at = html.search(/"itemStruct":\{"id":"\d+","desc":"/);
  if (at < 0) return {};
  const rest = html.slice(at);
  return {
    desc: jsonString(rest.match(/"desc":"((?:[^"\\]|\\.)*)"/)?.[1]),
    cover: jsonString(rest.match(/"cover":"((?:[^"\\]|\\.)*)"/)?.[1]),
  };
}

// The page's <title> and its <meta> tags by property or name, with HTML
// entities decoded. Attribute order and quote style vary by site.
function readHead(html) {
  const meta = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = {};
    for (const [, key, , dq, sq] of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
      attrs[key.toLowerCase()] = dq ?? sq;
    }
    const key = (attrs.property || attrs.name)?.toLowerCase();
    if (key && attrs.content !== undefined && !(key in meta)) meta[key] = decodeEntities(attrs.content);
  }
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return { meta, title: title === undefined ? undefined : decodeEntities(title) };
}

// Titles that name only the site, served instead of the real page.
function isSiteName(text) {
  return /^(airbnb|booking\.com|instagram|login\s*•\s*instagram|tiktok( - make your day)?|just a moment\.*)$/i.test(text);
}

// An absolute https address for a photo, or undefined. A relative address
// resolves against the page; an http address is asked for over https.
function absolutePhoto(address, pageUrl) {
  if (!address) return undefined;
  try {
    const url = new URL(address.trim(), pageUrl);
    if (url.protocol === "http:") url.protocol = "https:";
    if (url.protocol !== "https:") return undefined;
    const text = url.toString();
    return text.length <= 2048 ? text : undefined;
  } catch {
    return undefined;
  }
}

function jsonString(raw) {
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return undefined;
  }
}

// Shared with events.mjs, which reads names out of the same kind of page.
export function decodeEntities(text) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] !== "#") return named[code.toLowerCase()] ?? whole;
    const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
  });
}

export function clean(text) {
  const t = text?.replace(/\s+/g, " ").trim();
  return t || undefined;
}

function cut(text) {
  if (!text || text.length <= MAX_TEXT) return text;
  return text.slice(0, MAX_TEXT - 1).replace(/\s+\S*$/, "") + "…";
}

function withoutEmpty(record) {
  return Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined && v !== ""));
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// The calendar day a text names: "2027-02-13T22:00", "Feb 13, 2027",
// "february-13-2027", "February 22nd 2027" or "13 February 2027" all give
// "2027-02-13". null for no day, or a day that does not exist (30
// February). Shared with events.mjs and event-lists.mjs.
export function dayOf(text) {
  let year, month, day;
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  const monthFirst = text.match(/\b([a-z]{3})[a-z]*\.?[\s,-]+(\d{1,2})(?:st|nd|rd|th)?[\s,-]+(\d{4})\b/i);
  const dayFirst = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]{3})[a-z]*\.?[\s,-]+(\d{4})\b/i);
  if (iso) [, year, month, day] = iso.map(Number);
  else if (monthFirst) [year, month, day] = [Number(monthFirst[3]), MONTHS.indexOf(monthFirst[1].toLowerCase()) + 1, Number(monthFirst[2])];
  else if (dayFirst) [year, month, day] = [Number(dayFirst[3]), MONTHS.indexOf(dayFirst[2].toLowerCase()) + 1, Number(dayFirst[1])];
  else return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (month < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * An event's picture as the events check hands it to the app (a show's
 * photoUrl): from schema.org's image (an address, a list of them, or an
 * ImageObject with url), a feed's field, an <img> src or og:image. A
 * relative address resolves against the club's page; the result must be
 * https and at most 500 characters, or there is none. The image itself is
 * never fetched. Shared with events.mjs and event-lists.mjs.
 *
 * Inputs: value — what the page gives; pageUrl — the page it came from.
 * Output: the https address, or undefined.
 * Examples (each is a test in events.test.mjs):
 *   eventImage(["https://cdn.example/a.png"], page)            → "https://cdn.example/a.png"
 *   eventImage({ "@type": "ImageObject", url: "/b.jpg" }, "https://club.example/events") → "https://club.example/b.jpg"
 *   eventImage("http://cdn.example/c.jpg", page)               → undefined (not https)
 */
export function eventImage(value, pageUrl) {
  const first = Array.isArray(value) ? value[0] : value;
  const raw = typeof first === "string" ? first : typeof first?.url === "string" ? first.url : typeof first?.contentUrl === "string" ? first.contentUrl : undefined;
  if (!raw?.trim()) return undefined;
  try {
    const url = new URL(decodeEntities(raw.trim()), pageUrl);
    const text = url.toString();
    return url.protocol === "https:" && text.length <= 500 ? text : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The og:image of a page, as an event's picture (eventImage's rules): the
 * picture a club's one-night page gives when its event data has none.
 *
 * Inputs: html, pageUrl.
 * Output: the https address, or undefined.
 * Examples (checked through events.test.mjs): a night's page with og:image "https://cdn.example/n.jpg" → that address
 */
export function ogImage(html, pageUrl) {
  return eventImage(readHead(html).meta["og:image"], pageUrl);
}
