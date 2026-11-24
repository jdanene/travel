import type { ReactNode } from "react";
import { dayMonth, seasonSpan } from "../lib/format";
import { initials } from "../lib/initials";
import type { TripInfo } from "../types/trip";
import "./Avatars.css";
import "./FlyerHead.css";

/** The cover photo of design 12, from the project's media bucket. */
const COVER = "https://travel-ca8f9-media.s3.us-east-2.amazonaws.com/public/site/bali-cliff.jpg";

interface FlyerHeadProps {
  /** The organizer's name, drawn as the big avatar; absent before anyone organizes. */
  organizer?: string;
  /** The trip's info; a half-written trip without it shows the photo alone. */
  info: TripInfo | undefined;
  /** The photo's height: tall on the invitation (12/1); short on the home page once a friend has joined. */
  photo?: "tall" | "short";
  /** "6 of 8 replied"; shown in the desktop layout only (exception 9). */
  replied?: string;
  /** Lines under the date line: the note, or "All set". */
  children?: ReactNode;
}

/**
 * The top of the flyer: the cover photo, the organizer's avatar, the trip's
 * name and the date line. The invitation (12/1) and the home page (12/2)
 * share it, so the trip looks the same before and after a reply.
 *
 * Inputs: the organizer's name, the trip's info, the photo height, the
 * replied line, and any lines below. The date line is the season's months
 * and the anchor day.
 * Output: the head of the page; the title is the page's one h1. From 900 px
 * up the photo is a rounded picture in the left column.
 * Examples (checked at 375 px against 12/2, and at 1650 px):
 *   organizer "JD" → the photo, a 72 px "JD" circle, "Bali · Koh Phangan", "February – March 2027 · Full Moon Party 22 Feb"
 *   at 1650 px     → the same, with "6 of 8 replied" under the date line
 */
export function FlyerHead({ organizer, info, photo, replied, children }: FlyerHeadProps) {
  return (
    <header className="flyer">
      <div className={`flyer-hero${photo ? ` ${photo}` : ""}`} style={{ backgroundImage: `url(${COVER})` }} role="img" aria-label="Cliffs over the sea in Uluwatu, Bali" />
      <div className="flyer-name">
        {organizer && (
          <span className="avs">
            <span className="av d" aria-label={`Organizer: ${organizer}`}>
              {initials(organizer)}
            </span>
          </span>
        )}
        {info && (
          <>
            <h1 className="h1">{info.name}</h1>
            <p className="sub">
              {seasonSpan(info.season.from, info.season.to)} · {info.anchor.name} {dayMonth(info.anchor.date)}
            </p>
          </>
        )}
        {replied && <p className="cap flyer-replied">{replied}</p>}
        {children}
      </div>
    </header>
  );
}
