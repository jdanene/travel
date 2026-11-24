import { useState, type ReactNode } from "react";
import { seasonLine } from "../lib/format";
import type { TripInfo } from "../types/trip";
import { Face, type Person } from "./Avatars";
import "./Avatars.css";
import "./FlyerHead.css";

/** The cover photo of design 12, from the project's media bucket; it stays under the collage, so the box is never blank. */
const COVER = "https://travel-ca8f9-media.s3.us-east-2.amazonaws.com/public/site/bali-cliff.jpg";

/** The hype page's collage of the crew's photos, drawn to fill its box (public/hype/cover/). */
const COLLAGE = "/hype/cover/";

/** The countries under the trip's name, as on the hype page; the trip file does not hold them. */
const COUNTRIES = { shown: "(Indonesia, Thailand)", spoken: "Indonesia and Thailand" };

interface FlyerHeadProps {
  /** The organizer, drawn as the big avatar; absent before anyone organizes. */
  organizer?: Person;
  /** This device's member once joined; their own face is a button that opens onYou. */
  you?: Person;
  /** What a tap on your own face does: the photo sheet. */
  onYou?: () => void;
  /** The trip's info; a half-written trip without it shows the photo alone. */
  info: TripInfo | undefined;
  /** The photo's height: tall on the invitation (12/1); short on the home page once a friend has joined. */
  photo?: "tall" | "short";
  /** "6 of 8 replied"; shown in the desktop layout only (exception 9). */
  replied?: string;
  /** Lines under the title block: the note, or "All set". */
  children?: ReactNode;
}

/**
 * The top of the flyer: the cover, the organizer's avatar, and the title
 * block in the hype page's style. The invitation (12/1) and the home page
 * (12/2) share it, so the trip looks the same before and after a reply.
 *
 * The cover is the hype collage in a frame over the cliff photo; under
 * reduced motion or Save-Data it is the cliff photo alone. The title block
 * is the trip's name in the hype title's face, then the countries and the
 * months in the hype script; it is the page's one h1, and screen readers
 * hear it as one sentence.
 *
 * Inputs: the organizer, this device's member and what tapping their face
 * does, the trip's info, the photo height, the replied line, and any lines
 * below.
 * Output: the head of the page. From 900 px up the cover is a rounded
 * picture in the left column.
 * Examples (checked at 375 px and at 1650 px on the emulator):
 *   organizer JD, a friend RB → the collage, the "JD" circle with RB's small circle beside it,
 *                               "Bali · Koh Phangan", "(Indonesia, Thailand) · Feb–Mar 2027"
 *   JD on JD's own phone      → the "JD" circle is the button; no second circle
 *   reduced motion            → the cliff photo, no collage
 */
export function FlyerHead({ organizer, you, onYou, info, photo, replied, children }: FlyerHeadProps) {
  const [still] = useState(prefersStill);
  const youAreOrganizer = organizer !== undefined && you !== undefined && organizer.id === you.id;
  const yourFace = (person: Person, className: string) => (
    <button type="button" className="flyer-you" onClick={onYou} aria-label="Your photo">
      <Face person={person} className={className} />
    </button>
  );

  return (
    <header className="flyer">
      <div className={`flyer-hero${photo ? ` ${photo}` : ""}`} style={{ backgroundImage: `url(${COVER})` }} role="img" aria-label={still ? "Cliffs over the sea in Uluwatu, Bali" : "Photos from the trip"}>
        {!still && <iframe className="flyer-collage" src={COLLAGE} title="Trip photos" aria-hidden="true" tabIndex={-1} loading="lazy" scrolling="no" />}
      </div>
      <div className="flyer-name">
        {(organizer || you) && (
          <span className="avs flyer-faces">
            {organizer && (youAreOrganizer && onYou ? yourFace(organizer, "d") : <Face person={organizer} className="d" />)}
            {you && onYou && !youAreOrganizer && yourFace(you, "you flyer-small")}
          </span>
        )}
        {info && (
          <h1 className="flyer-title" aria-label={`${info.name.split(" · ").join(" and ")}, ${COUNTRIES.spoken}, ${seasonLine(info.season.from, info.season.to, "long")}`}>
            <span className="flyer-trip">{info.name}</span>
            <span className="flyer-where">
              <span>{COUNTRIES.shown}</span>
              <span className="flyer-dot" aria-hidden="true"> · </span>
              <span>{seasonLine(info.season.from, info.season.to, "short")}</span>
            </span>
          </h1>
        )}
        {replied && <p className="cap flyer-replied">{replied}</p>}
        {children}
      </div>
    </header>
  );
}

/** Whether the cover should stay a still photo: reduced motion, or Save-Data. */
function prefersStill(): boolean {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  return saveData || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
