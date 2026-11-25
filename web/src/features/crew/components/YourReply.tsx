import { useState } from "react";
import { Notice } from "../../../components/Notice";
import type { WriteResult } from "../../../lib/db";
import type { Member, MemberId, Reply } from "../../../types/trip";
import { saveReply } from "../api/crew";
import { REPLIES } from "../lib/crew";
import "./YourReply.css";

/**
 * Your reply on the home page, under the crew line in the title block:
 * I'm in / Maybe / Can't with your reply picked, always showing, so a friend
 * can change their mind after the invitation has gone (plan case 7; owner,
 * 25 Nov 2026, option B). A change saves at once with its "said maybe" line
 * in Activity, and the crew line's counts follow when the write lands.
 * "Can't" also brings the invitation back, as before.
 *
 * Inputs: the trip, this device's member and their record.
 * Output: the three buttons. A refused write says "This was not saved.";
 * with no connection the SDK keeps the change and the row says "No
 * connection" if it gives up.
 * Examples (checked on screen):
 *   KA is in, taps "Maybe" → Maybe picked; "1 in · 2 maybe"; Activity "KA said maybe"
 *   KA taps the reply already picked → nothing is written
 */
export function YourReply({ tripId, memberId, member }: { tripId: string; memberId: MemberId; member: Member }) {
  const [failure, setFailure] = useState<WriteResult | null>(null);

  const pick = (reply: Reply) => {
    if (reply === member.reply) return;
    setFailure(null);
    void saveReply(tripId, memberId, member.name, reply, member).then((result) => setFailure(result.ok ? null : result));
  };

  return (
    <div className="your-reply">
      {failure && !failure.ok && <Notice>{failure.reason === "refused" ? "This was not saved." : "No connection"}</Notice>}
      <div className="seg3" role="group" aria-label="Your reply">
        {REPLIES.map(({ reply, label }) => (
          <button key={reply} type="button" aria-pressed={member.reply === reply} onClick={() => pick(reply)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
