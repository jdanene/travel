import { Icon, type IconName } from "../../../components/Icon";
import type { Reply } from "../../../types/trip";
import { REPLIES } from "../lib/crew";
import "./ReplyCircles.css";

const ICONS: Record<Reply, IconName> = { in: "check", maybe: "ask", out: "close" };

/**
 * I'm in / Maybe / Can't as three circles with the word under each, in
 * their meaning's colour (owner, 25 Nov 2026: "semantic colors like im in
 * is green", "circles not squares"): a pale tint at rest, the full colour
 * with a light ring when picked. The invitation and the home page both use
 * it.
 *
 * Inputs: picked — this member's reply, if any; onPick — what a tap does.
 * Output: the group, heard as "Your reply", each circle a toggle button.
 * Examples (checked on screen):
 *   picked "in"  → a full green circle with a tick, Maybe and Can't pale
 *   no reply     → three pale circles
 */
export function ReplyCircles({ picked, onPick }: { picked: Reply | undefined; onPick: (reply: Reply) => void }) {
  return (
    <div className="reply-circles" role="group" aria-label="Your reply">
      {REPLIES.map(({ reply, label, tone }) => (
        <button key={reply} type="button" data-tone={tone} aria-pressed={picked === reply} onClick={() => onPick(reply)}>
          <span className="rc-dot">
            <Icon name={ICONS[reply]} size={24} />
          </span>
          <span className="rc-word">{label}</span>
        </button>
      ))}
    </div>
  );
}
