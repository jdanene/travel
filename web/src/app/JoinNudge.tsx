import type { Nudge } from "./lib/nudge";
import "./SharedEvents.css";

/**
 * The nudge to join, the point of the shared events pages (owner, 25 Nov
 * 2026: "its a nudge to join the trip"; of the drawn options he picked the
 * bar, "2 is slight enough nudge"): one white bar fixed to the foot of the
 * screen, above the phone's home bar. On the left the bold line and the
 * small count (lib/nudge.ts); on the right the main button, which opens
 * the splash, /?t=<tripId>, whose button then opens the trip and its
 * invitation. It fades in once and never moves. To change the nudge,
 * change this one component; the page places it once.
 *
 * Inputs: tripId; nudge — its words, from nudgeFor().
 * Output: the bar, a landmark named "Join the trip" or "Open the trip".
 * Examples (checked on the emulator at 390 px and 1650 px):
 *   a new device, 2 in      → "You're invited", "2 are in so far", "Join the trip"
 *   this device joined, in  → "You're in this trip", "Open the trip"
 */
export function JoinNudge({ tripId, nudge }: { tripId: string; nudge: Nudge }) {
  return (
    <aside className="join-dock" aria-label={nudge.action}>
      <div className="join-bar">
        <p className="join-words">
          <b>{nudge.title}</b>
          {nudge.line && <span>{nudge.line}</span>}
        </p>
        <a className="btn join-go" href={`/?${new URLSearchParams({ t: tripId })}`}>
          {nudge.action}
        </a>
      </div>
    </aside>
  );
}
