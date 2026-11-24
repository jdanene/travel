import type { ReactNode } from "react";
import { dayMonth, longMonthYear } from "../lib/format";
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
  /** The taller photo of the invitation (12/1). */
  tall?: boolean;
  /** Lines under the date line: the note, or "All set". */
  children?: ReactNode;
}

/**
 * The top of the flyer: the cover photo, the organizer's avatar, the trip's
 * name and the date line. The invitation (12/1) and the home page (12/2)
 * share it, so the trip looks the same before and after a reply.
 *
 * Inputs: the organizer's name, the trip's info, the photo height, and any
 * lines below. The date line is the season's month and the anchor day.
 * Output: the head of the page; the title is the page's one h1.
 * Examples (checked at 390 px against 12/2):
 *   organizer "JD" → the photo, a 72 px "JD" circle, "Bali · Koh Phangan", "February 2027 · Full Moon Party 22 Feb"
 */
export function FlyerHead({ organizer, info, tall = false, children }: FlyerHeadProps) {
  return (
    <header>
      <div className={`flyer-hero${tall ? " tall" : ""}`} style={{ backgroundImage: `url(${COVER})` }} role="img" aria-label="Cliffs over the sea in Uluwatu, Bali" />
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
              {longMonthYear(info.season.from)} · {info.anchor.name} {dayMonth(info.anchor.date)}
            </p>
          </>
        )}
        {children}
      </div>
    </header>
  );
}
