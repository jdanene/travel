import { useState } from "react";
import { Icon } from "../../../components/Icon";
import { Notice } from "../../../components/Notice";
import type { Trip } from "../../../types/trip";
import { clubOf } from "../lib/club";
import { eventLink, showPlace, timeLine, whenLine } from "../lib/detail";
import { ClubSheet } from "./ClubSheet";
import { EventCard } from "./EventCard";
import "./Parties.css";

interface EventPageProps {
  trip: Trip;
  /** The event to show, from the address. */
  showId: string;
  /** The shared page of every event: /trip/<id>/events. */
  allHref: string;
}

/**
 * The shared page of one event (owner, 25 Nov 2026: "share … a single
 * event"; of three layouts he chose S1, "just that event"): the event big,
 * read-only, with no crew. Top to bottom: a wide picture card with the
 * artist over its foot (the event's own picture, the artist or line-up
 * flyer its club publishes; else the venue's; else a plain card; owner,
 * 25 Nov 2026: "try to get a pic of the artist or line up"), the date in the show sheet's words with the
 * night's start and end under it when it has them, the place line
 * and the venue's one line, "not confirmed", the about line, then "Event
 * page" when the event has an https link, and "See all 27 events". The
 * place line is a button: it opens the club sheet, with "Google Maps" (the
 * page has no map of its own).
 *
 * Inputs: the trip from the one listener, the event's id, and the address
 * of every event.
 * Output: the page's content under the title. An id the trip does not
 * hold, or an event removed while the page is open, reads "This event was
 * removed." with "See all events".
 * Examples (checked on the emulator at 390 px and 1650 px):
 *   Peggy Gou at Savaya, with its photoUrl → Savaya's flyer for the night, "PEGGY GOU", "Sat 13 Feb 2027", "Savaya · Uluwatu, Bali, Indonesia", "Club on the cliffs", Event page, "See all 12 events"
 *   Black Coffee at Potato Head, no photoUrl → Potato Head's picture
 *   a weekly show        → "Every Sunday from 7 Feb"
 *   a show from 22:00 to 04:00 → "10 pm – 4 am" under the date; a show with no times → no line
 *   a friend's party at a venue the trip does not know → the plain card, the place line alone
 *   /events/nope         → "This event was removed." and "See all events"
 */
export function EventPage({ trip, showId, allHref }: EventPageProps) {
  const [clubOpen, setClubOpen] = useState(false);
  const shows = trip.parties?.shows ?? {};
  const show = shows[showId];
  if (!show) {
    return (
      <div className="event-page">
        <Notice>This event was removed.</Notice>
        <a className="btn sec event-way" href={allHref}>
          See all events
        </a>
      </div>
    );
  }

  const place = showPlace(show, trip);
  const link = eventLink(show.link);
  const time = timeLine(show);
  const count = Object.keys(shows).length;
  return (
    <article className="event-page" aria-labelledby="event-artist">
      <EventCard photos={[show.photoUrl, place.photoUrl]} artist={show.artist} />
      <p className="event-when">
        {whenLine(show)}
        {time && <span>{time}</span>}
      </p>
      <p className="event-where">
        {/* "Where is this" is a friend's next question: the place opens the club sheet (design exception 37). */}
        <button type="button" className="event-club" aria-haspopup="dialog" aria-label={`${place.where}, about this club`} onClick={() => setClubOpen(true)}>
          {place.where}
          <Icon name="info" size={18} />
        </button>
        {place.line && <span>{place.line}</span>}
      </p>
      {show.verified === false && <span className="nc">not confirmed</span>}
      {show.about && <p className="event-about">{show.about}</p>}
      <div className="event-ways">
        {link?.kind === "page" && (
          <a className="btn sec event-way" href={link.href} target="_blank" rel="noopener noreferrer">
            <Icon name="link" size={20} />
            Event page
          </a>
        )}
        <a className="btn sec event-way" href={allHref}>
          {count > 1 ? `See all ${count} events` : "See all events"}
        </a>
      </div>
      <ClubSheet club={clubOpen ? clubOf({ destination: show.destination, name: show.venue, ...(show.area ? { area: show.area } : {}) }, trip) : undefined} onClose={() => setClubOpen(false)} />
    </article>
  );
}
