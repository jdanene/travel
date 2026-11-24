import { useState } from "react";
import { Sheet } from "../../../components/Sheet";
import { Notice } from "../../../components/Notice";
import { initials } from "../../../lib/initials";
import type { WriteResult } from "../../../lib/db";
import type { Member, MemberId } from "../../../types/trip";
import { savePhoto } from "../api/photo";
import { PhotoField } from "../../../components/PhotoField";

interface PhotoSheetProps {
  open: boolean;
  tripId: string;
  memberId: MemberId;
  member: Member;
  onClose: () => void;
}

/**
 * "Your photo": the sheet a joined friend opens by tapping their own face
 * on the flyer. It shows the photo (or the initials) large, with "Change
 * photo" and "Remove photo". A change saves at once; the circles across the
 * page follow when the write lands.
 *
 * Inputs: whether it is open, the trip, this device's member and their
 * record, and what closing does.
 * Output: the sheet. A refused write says "This was not saved."; with no
 * connection the change waits and lands later, and the sheet says "No
 * connection" if the SDK gives up.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   RB with no photo → "RB" in a large circle and "Add a photo"
 *   pick a photo     → the circle shows it; RB's circles in Dates and Parties change too
 *   "Remove photo"   → back to "RB"
 */
export function PhotoSheet({ open, tripId, memberId, member, onClose }: PhotoSheetProps) {
  const [failure, setFailure] = useState<WriteResult | null>(null);

  // The SDK shows the change at once and sends it when it can; only a refusal or a failure comes back.
  const change = (photo: string | null) => {
    setFailure(null);
    void savePhoto(tripId, memberId, photo).then((result) => setFailure(result.ok ? null : result));
  };

  return (
    <Sheet open={open} title="Your photo" onClose={onClose}>
      <div className="photo-sheet">
        <span className="photo-big" aria-hidden="true">
          {member.photo ? <img src={member.photo} alt="" /> : initials(member.name)}
        </span>
        {failure && !failure.ok && <Notice>{failure.reason === "refused" ? "This was not saved." : "No connection"}</Notice>}
        <PhotoField photo={member.photo ?? null} onChange={change} />
      </div>
    </Sheet>
  );
}
