import { createContext, useContext, type ReactNode } from "react";
import { initials } from "../lib/initials";
import "./Avatars.css";

/** Each member's photo by member id; the trip page fills it once, so every circle in the app can show it. */
const Photos = createContext<Record<string, string | undefined>>({});

/** Each member's place in the crew, in join order; it picks their colour, so no two friends share one. */
const Order = createContext<Record<string, number>>({});

/**
 * GTA-poster colours for a friend with no photo (owner, 24 Nov 2026: "each person gets a different color").
 * The first twelve friends take these in join order; a larger crew gets hues spaced round the wheel.
 */
const COLOURS: Array<[background: string, text: string]> = [
  ["#f0257e", "#fff"], ["#7a2fd6", "#fff"], ["#f26a1b", "#fff"], ["#0e9aa7", "#fff"], ["#2f9e44", "#fff"], ["#ffc61a", "#1c1c1e"],
  ["#1d6ff2", "#fff"], ["#d7263d", "#fff"], ["#00c2a8", "#1c1c1e"], ["#b5179e", "#fff"], ["#8ac926", "#1c1c1e"], ["#3a2e8c", "#fff"],
];

/**
 * The colour of the friend at one place in the crew.
 *
 * Inputs: at — their place in join order, from 0.
 * Output: the circle's background and text colour; no two places share a background.
 * Examples (each is a test in Avatars.test.ts):
 *   0  → pink "#f0257e" with white text
 *   12 → a hue past the twelve, not one of them
 */
export function colourAt(at: number): { background: string; color: string } {
  if (at < COLOURS.length) return { background: COLOURS[at][0], color: COLOURS[at][1] };
  // The golden angle spreads later friends round the wheel without a repeat.
  return { background: `hsl(${Math.round((at * 137.508) % 360)} 70% 42%)`, color: "#fff" };
}

/**
 * Gives every circle below it the crew's photos, so no feature passes them
 * on. The trip page wraps the whole page in it.
 *
 * Inputs: photos — member id to photo (a data URL); order — the member ids in join order, which
 * gives each friend their own colour; and the page.
 * Output: the page, unchanged.
 * Examples (checked on screen): RB's photo in the map → RB's circle shows it in Dates, Stay and Parties
 */
export function PhotosProvider({ photos, order, children }: { photos: Record<string, string | undefined>; order: string[]; children: ReactNode }) {
  const places = Object.fromEntries(order.map((id, at) => [id, at]));
  return (
    <Photos.Provider value={photos}>
      <Order.Provider value={places}>{children}</Order.Provider>
    </Photos.Provider>
  );
}

/** The photo of one member, if they added one. */
export function usePhoto(id: string): string | undefined {
  return useContext(Photos)[id];
}

/**
 * One circle: the person's photo when they have one, else their initials.
 *
 * Inputs: the person, and the circle's classes ("you").
 * Output: a span.av; the photo fills it, and the circle's border stays. With no photo the
 * circle takes the friend's own colour (colourAt).
 * Examples (checked on screen):
 *   RB with a photo     → the photo, cropped round
 *   RB with no photo    → "RB"
 */
export function Face({ person, className }: { person: Person; className: string }) {
  const photo = useContext(Photos)[person.id];
  const at = useContext(Order)[person.id];
  return (
    <span className={`av ${className}${photo ? " has-photo" : ""}`} style={photo || at === undefined ? undefined : colourAt(at)}>
      {photo ? <img src={photo} alt="" draggable={false} /> : initials(person.name)}
    </span>
  );
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
        <Face key={person.id} person={person} className={person.id === you ? "you" : ""} />
      ))}
      {rest > 0 && <span className="av">+{rest}</span>}
    </span>
  );
}
