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
  /** The organizer, drawn as the big avatar on the invitation; absent on the home page, where the crew sits in the title block. */
  organizer?: Person;
  /** The trip's info; a half-written trip without it shows the photo alone. */
  info: TripInfo | undefined;
  /** The photo's height: tall on the invitation (12/1); short on the home page once a friend has joined. */
  photo?: "tall" | "short";
  /** Lines under the title block: the note, the crew (mock 5), or "All set". */
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
 * hear it as one sentence. With no organizer the title itself overlaps
 * the photo's foot.
 *
 * Inputs: the organizer, the trip's info, the photo height, and any lines below.
 * Output: the head of the page. From 900 px up the cover is a rounded
 * picture in the left column.
 * Examples (checked at 375 px and at 1650 px on the emulator):
 *   invitation, organizer JD → the collage, the "JD" circle, "Bali · Koh Phangan", "(Indonesia, Thailand) · Feb 2027"
 *   home page, no organizer  → the title over the photo's foot, the crew under it
 *   reduced motion           → the cliff photo, no collage
 */
export function FlyerHead({ organizer, info, photo, children }: FlyerHeadProps) {
  const [still] = useState(prefersStill);

  return (
    <header className="flyer">
      <div className={`flyer-hero${photo ? ` ${photo}` : ""}`} style={{ backgroundImage: `url(${COVER})` }} role="img" aria-label={still ? "Cliffs over the sea in Uluwatu, Bali" : "Photos from the trip"}>
        {!still && <iframe className="flyer-collage" src={COLLAGE} title="Trip photos" aria-hidden="true" tabIndex={-1} scrolling="no" />}
      </div>
      <div className={`flyer-name${organizer ? "" : " bare"}`}>
        {organizer && (
          <span className="avs flyer-faces">
            <Face person={organizer} className="d" />
          </span>
        )}
        {info && (
          <h1 className="flyer-title" aria-label={`${info.name.split(" · ").join(" and ")}, ${COUNTRIES.spoken}, ${seasonLine(info.anchor.date, info.anchor.date, "long")}`}>
            <span className="flyer-trip">{info.name}</span>
            <span className="flyer-where">
              <span>{COUNTRIES.shown}</span>
              <span className="flyer-dot" aria-hidden="true"> · </span>
              <span>{seasonLine(info.anchor.date, info.anchor.date, "short")}</span>
            </span>
          </h1>
        )}
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
