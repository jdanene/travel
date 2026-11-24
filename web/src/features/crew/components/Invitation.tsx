import { FlyerHead } from "../../../components/FlyerHead";
import type { Reply, TripInfo } from "../../../types/trip";
import type { CrewView } from "../api/crew";
import { repliedLine } from "../lib/crew";
import "./Invitation.css";

/** The three replies of screen 12/1, in the mock's words. */
export const REPLIES: Array<{ reply: Reply; label: string }> = [
  { reply: "in", label: "I'm in" },
  { reply: "maybe", label: "Maybe" },
  { reply: "out", label: "Can't" },
];

interface InvitationProps {
  info: TripInfo | undefined;
  crew: CrewView;
  /** A tap on a reply. */
  onReply: (reply: Reply) => void;
}

/**
 * Screen 12/1, the flyer: the trip, the organizer's note, and three reply
 * buttons. A friend sees the trip before answering and answers in one tap,
 * with no app and no account.
 *
 * Inputs: the trip's info (absent on a half-written trip), the crew view,
 * and what a reply tap does.
 * Output: the invitation. With no note, the quotation is left out (Trip 5,
 * case 5). This device's reply, once given, shows pressed.
 * Examples (checked at 390 px against 12/1):
 *   the example trip, 6 of 8 replied → "Bali · Koh Phangan", the note, "I'm in / Maybe / Can't", "6 of 8 replied · no app, no account"
 */
export function Invitation({ info, crew, onReply }: InvitationProps) {
  return (
    <>
      <FlyerHead organizer={crew.organizer} info={info} tall>
        {info?.note && (
          <p className="invite-note">
            “{info.note}”{info.noteBy && ` — ${info.noteBy}`}
          </p>
        )}
      </FlyerHead>
      <div className="invite-reply">
        <div className="seg3" role="group" aria-label="Your reply">
          {REPLIES.map(({ reply, label }) => (
            <button key={reply} type="button" aria-pressed={crew.member?.reply === reply} onClick={() => onReply(reply)}>
              {label}
            </button>
          ))}
        </div>
        <p className="cap">{repliedLine(crew.expected, crew.byId)} · no app, no account</p>
      </div>
    </>
  );
}
