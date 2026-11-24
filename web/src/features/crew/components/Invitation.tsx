import { useState } from "react";
import { Face, tone } from "../../../components/Avatars";
import { FlyerHead } from "../../../components/FlyerHead";
import { Notice } from "../../../components/Notice";
import type { WriteResult } from "../../../lib/db";
import type { Reply, TripInfo } from "../../../types/trip";
import { comeBack, join, saveReply, type CrewView, type Person } from "../api/crew";
import { savePhoto } from "../api/photo";
import { burst } from "./confetti";
import { JoinSheet } from "./JoinSheet";
import { repliedLine, REPLIES } from "../lib/crew";
import "./Invitation.css";

interface InvitationProps {
  tripId: string;
  uid: string;
  info: TripInfo | undefined;
  crew: CrewView;
}

/**
 * Screen 12/1, the flyer: the trip, the organizer's note, and three reply
 * buttons. A friend sees the trip before answering and answers in one tap,
 * with no app and no account.
 *
 * The first tap opens "Who are you?"; a friend who already replied changes
 * the reply in one tap (case 7). The tapped reply shows pressed at once;
 * the SDK sends it when the connection allows, and flips it back if the
 * rules refuse it, with the reason above the buttons (case 8). When an
 * "I'm in" saves, a short burst of confetti falls over the page.
 *
 * A friend who replied on another device sees, under the replied line,
 * "Been here before? Tap your name:" and every member's face and name; a
 * tap points this device at that member, keeps their reply, and opens the
 * trip. The join sheet's "Already replied" list does the same with a new
 * reply.
 *
 * Inputs: the trip, this device, the trip's info (absent on a half-written
 * trip) and the crew view.
 * Output: the invitation. With no note, the quotation is left out (Trip 5,
 * case 5). "I'm in" is the main button, filled in the accent colour, as on
 * 12/1; "Maybe" and "Can't" are secondary. From 900 px up the photo takes
 * the left column and the trip, the note and the replies the right.
 * Examples (checked on the emulator at 375 px against 12/1, and at 1650 px):
 *   the example trip, 6 of 8 replied → "Bali · Koh Phangan", the note, "I'm in / Maybe / Can't", "6 of 8 replied · no app, no account"
 *   "I'm in" saves                   → confetti for 1.5 s, then the home page; "Maybe" → no confetti
 *   1650 px                          → the photo on the left; the trip, the note and the buttons on the right
 *   Dom replied on a phone; the laptop taps "Dom" under "Been here before?" → the home page as Dom, Dom's reply kept
 */
export function Invitation({ tripId, uid, info, crew }: InvitationProps) {
  const [joining, setJoining] = useState<Reply | null>(null);
  const [failure, setFailure] = useState<WriteResult | null>(null);

  // A saved "I'm in" gets one burst of confetti; Maybe and Can't do not.
  const report = (reply: Reply) => (result: WriteResult) => {
    setFailure(result.ok ? null : result);
    if (result.ok && reply === "in") burst();
  };

  const onReply = (reply: Reply) => {
    if (crew.memberId && crew.member) void saveReply(tripId, crew.memberId, crew.member.name, reply).then(report(reply));
    else setJoining(reply);
  };

  // The photo is saved after the reply, so a photo the rules refuse never costs the friend their reply.
  const onPick = (person: Person, photo: string | null) => {
    const reply = joining!;
    setJoining(null);
    void join(tripId, uid, person, crew.byId[person.id] ?? null, reply).then((result) => {
      report(reply)(result);
      if (result.ok && photo) void savePhoto(tripId, person.id, photo).then((saved) => setFailure(saved.ok ? null : saved));
    });
  };

  const onComeBack = (memberId: string) => {
    void comeBack(tripId, uid, memberId).then((result) => setFailure(result.ok ? null : result));
  };

  return (
    <div className="invite">
      <FlyerHead organizer={crew.organizer} info={info} photo="tall">
        {info?.note && (
          <p className="invite-note">
            “{info.note}”{info.noteBy && ` — ${info.noteBy}`}
          </p>
        )}
      </FlyerHead>
      <div className="invite-reply">
        {failure && !failure.ok && <Notice>{failure.reason === "refused" ? "This was not saved." : "No connection"}</Notice>}
        <div className="seg3" role="group" aria-label="Your reply">
          {REPLIES.map(({ reply, label }) => (
            <button
              key={reply}
              type="button"
              className={reply === "in" ? "main" : undefined}
              aria-pressed={crew.member?.reply === reply}
              onClick={() => onReply(reply)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="cap">{repliedLine(crew.expected, crew.byId)} · no app, no account</p>
        {!crew.memberId && crew.members.length > 0 && (
          <div className="invite-back">
            <p id="invite-back-label">Been here before? Tap your name:</p>
            <ul aria-labelledby="invite-back-label">
              {crew.members.map((member) => (
                <li key={member.id}>
                  <button type="button" onClick={() => onComeBack(member.id)}>
                    <Face person={member} className={tone(member.id)} />
                    <span>{member.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <JoinSheet reply={joining} crew={crew} onClose={() => setJoining(null)} onPick={onPick} />
    </div>
  );
}
