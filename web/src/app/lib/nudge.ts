import type { Crew } from "../../types/trip";

/** What the join bar says: its bold line, its small line (none with nobody in yet), and its button. */
export interface Nudge {
  title: string;
  line: string | null;
  action: "Join the trip" | "Open the trip";
}

/**
 * The words of the join bar at the foot of the shared events pages (owner,
 * 25 Nov 2026: "its a nudge to join the trip", "2 is slight enough
 * nudge"). A visitor reads "You're invited" and "Join the trip"; a device
 * that already joined this trip reads where it stands and "Open the trip".
 * The small line counts the friends who are in and never names one, as the
 * page may be forwarded beyond the crew.
 *
 * Inputs: crew — the trip's crew branch, or undefined; uid — this device.
 * Output: the bar's title, small line and button.
 * Examples (each is a test in nudge.test.ts):
 *   a new device, 5 friends in              → "You're invited", "5 are in so far", "Join the trip"
 *   a new device, nobody in yet             → "You're invited", no small line, "Join the trip"
 *   this device joined with "in", 1 in      → "You're in this trip", "1 is in so far", "Open the trip"
 *   this device joined with "maybe"         → "You've replied", …, "Open the trip"
 *   a device listed with no member record   → "You're invited" (not joined)
 */
export function nudgeFor(crew: Crew | undefined, uid: string): Nudge {
  const members = crew?.members ?? {};
  const mine = members[crew?.devices?.[uid] ?? ""];
  const count = Object.values(members).filter((member) => member?.reply === "in").length;
  const line = count === 0 ? null : count === 1 ? "1 is in so far" : `${count} are in so far`;
  if (!mine) return { title: "You're invited", line, action: "Join the trip" };
  return { title: mine.reply === "in" ? "You're in this trip" : "You've replied", line, action: "Open the trip" };
}
