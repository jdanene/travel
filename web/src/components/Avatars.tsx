import { createContext, useContext, type ReactNode } from "react";
import { initials } from "../lib/initials";
import "./Avatars.css";

/** Each member's photo by member id; the trip page fills it once, so every circle in the app can show it. */
const Photos = createContext<Record<string, string | undefined>>({});

/**
 * Gives every circle below it the crew's photos, so no feature passes them
 * on. The trip page wraps the whole page in it.
 *
 * Inputs: photos — member id to photo (a data URL), and the page.
 * Output: the page, unchanged.
 * Examples (checked on screen): RB's photo in the map → RB's circle shows it in Dates, Stay and Parties
 */
export function PhotosProvider({ photos, children }: { photos: Record<string, string | undefined>; children: ReactNode }) {
  return <Photos.Provider value={photos}>{children}</Photos.Provider>;
}

/** The photo of one member, if they added one. */
export function usePhoto(id: string): string | undefined {
  return useContext(Photos)[id];
}

/**
 * One circle: the person's photo when they have one, else their initials.
 *
 * Inputs: the person, and the circle's classes (its tone, "you").
 * Output: a span.av; the photo fills it, and the circle's border stays.
 * Examples (checked on screen):
 *   RB with a photo     → the photo, cropped round
 *   RB with no photo    → "RB"
 */
export function Face({ person, className }: { person: Person; className: string }) {
  const photo = useContext(Photos)[person.id];
  return (
    <span className={`av ${className}${photo ? " has-photo" : ""}`}>
      {photo ? <img src={photo} alt="" draggable={false} /> : initials(person.name)}
    </span>
  );
}

/** The mock's four avatar tones; a friend keeps one tone everywhere. */
const TONES = ["", "b", "c", "d"];

export function tone(id: string): string {
  let sum = 0;
  for (const char of id) sum = (sum + char.charCodeAt(0)) % TONES.length;
  return TONES[sum];
}

export interface Person {
  id: string;
  name: string;
}

interface AvatarsProps {
  people: Person[];
  /** This device's member, drawn in the accent colour. */
  you?: string | null;
  /** How many to draw before "+N"; the mock draws six at most. */
  max?: number;
}

/**
 * A row of initials: who replied, who said yes, who hearted, who is in.
 * Every "who" list in the app draws with it, so a friend looks the same
 * everywhere: their photo when they added one, else their initials.
 *
 * Inputs: the people in order, this device's member, and the most to draw.
 * Output: the row, with a "+N" circle past the limit; screen readers hear
 * the names. Nothing when the list is empty.
 * Examples (checked on screen):
 *   six people          → six circles, as on screen 1
 *   nine people, max 6  → six circles and "+3"
 */
export function Avatars({ people, you = null, max = 6 }: AvatarsProps) {
  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="avs" role="img" aria-label={people.map((person) => person.name).join(", ")}>
      {shown.map((person) => (
        <Face key={person.id} person={person} className={person.id === you ? "you" : tone(person.id)} />
      ))}
      {rest > 0 && <span className="av">+{rest}</span>}
    </span>
  );
}
