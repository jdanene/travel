import { initials } from "../lib/initials";
import "./Avatars.css";

/** The mock's four avatar tones; a friend keeps one tone everywhere. */
const TONES = ["", "b", "c", "d"];

function tone(id: string): string {
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
 * everywhere.
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
        <span key={person.id} className={`av ${person.id === you ? "you" : tone(person.id)}`}>
          {initials(person.name)}
        </span>
      ))}
      {rest > 0 && <span className="av">+{rest}</span>}
    </span>
  );
}
