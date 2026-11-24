// The sites a pasted link may point to. This file is the only place that
// knows them: the handler asks it about the pasted address and about every
// redirect. The events check opens its own list (event-sources.mjs). It
// does not fetch anything.

const SITES = [
  // Airbnb on airbnb.com, a country domain (airbnb.co.uk, airbnb.com.au,
  // airbnb.de) or its share-link domain abnb.me.
  { site: "airbnb", kind: "listing", host: /^(?:(?:www|m)\.)?airbnb\.(?:com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})$|^abnb\.me$/ },
  { site: "booking", kind: "listing", host: /^(?:(?:www|m)\.)?booking\.com$/ },
  { site: "instagram", kind: "post", host: /^(?:(?:www|m)\.)?instagram\.com$/ },
  { site: "tiktok", kind: "post", host: /^(?:(?:www|m|vm)\.)?tiktok\.com$/ },
];

/**
 * Says which allowed site an address belongs to, so the reader opens nothing
 * else.
 *
 * Inputs: address, the text a friend pasted or a redirect's target, already
 *   resolved to an absolute address.
 *
 * Output: { site, kind } when the address is https on an allowed host, where
 *   site is "airbnb", "booking", "instagram" or "tiktok" and kind is "listing"
 *   (a place to stay) or "post" (a social post). null for anything else: not
 *   an address, not https, a host off the list, or a user name or port in the
 *   address.
 *
 * Examples:
 *   siteOf("https://www.airbnb.com/rooms/1041153373514809459")
 *     → { site: "airbnb", kind: "listing" }
 *   siteOf("https://vm.tiktok.com/ZMabc123/") → { site: "tiktok", kind: "post" }
 *   siteOf("http://www.booking.com/hotel/th/x.html") → null   (not https)
 *   siteOf("https://www.airbnb.com.evil.example/rooms/1") → null
 *   siteOf("https://www.booking.com@evil.example/") → null   (host is evil.example)
 */
export function siteOf(address) {
  const url = plainHttps(address);
  const found = url && SITES.find((s) => s.host.test(url.hostname));
  return found ? { site: found.site, kind: found.kind } : null;
}

/**
 * Reads an address the reader might open: https, on the default port, with
 * no user name. The pasted-link sites above and the event sources
 * (event-sources.mjs) both pass through it.
 *
 * Inputs: address, any text.
 * Output: the parsed URL, or null for anything else.
 * Examples (checked through siteOf's tests):
 *   plainHttps("https://www.savaya.com/event-calendar") → URL { hostname: "www.savaya.com", … }
 *   plainHttps("https://www.booking.com@evil.example/") → null
 */
export function plainHttps(address) {
  let url;
  try {
    url = new URL(address);
  } catch {
    return null;
  }
  return url.protocol === "https:" && !url.username && !url.password && !url.port ? url : null;
}
