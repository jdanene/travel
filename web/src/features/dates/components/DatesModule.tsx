import { useState } from "react";
import { Avatars } from "../../../components/Avatars";
import { Icon } from "../../../components/Icon";
import { Notice } from "../../../components/Notice";
import type { WriteResult } from "../../../lib/db";
import { dayRange, weekdayDate, weekdayRange } from "../../../lib/format";
import { initials } from "../../../lib/initials";
import type { Answer, Dates, Member, MemberId, TripInfo } from "../../../types/trip";
import { confirmDates, saveAnswer, undoDates } from "../api/dates";
import { mostYes, notAnswered, summary } from "../lib/dates";
import "./DatesModule.css";

const CHOICES: Array<{ answer: Answer; label: string }> = [
  { answer: "yes", label: "Yes" },
  { answer: "maybe", label: "Maybe" },
  { answer: "no", label: "No" },
];

interface DatesModuleProps {
  tripId: string;
  info: TripInfo | undefined;
  dates: Dates | undefined;
  expected: Record<MemberId, string>;
  members: Record<MemberId, Member>;
  memberId: MemberId;
  isOrganizer: boolean;
}

/**
 * The Dates module, open in place (frame 12/3, content 20/2 and 20/3).
 * A friend answers each option in one tap and sees the counts move. The
 * organizer also sees who said yes, who has not answered, and confirms
 * one option; after the confirm the module still opens, shows the counts
 * and takes no new answers, and the organizer can undo it.
 *
 * Inputs: the trip id and info, the dates branch, the crew as plain data,
 * this device's member, and whether it is an organizer.
 * Output: the module's content. No options: "No dates to vote on yet."
 * Examples (checked at 390 px against 20/2 and 20/3, in the frame of 12/3):
 *   a friend      → three option cards, "Most yes" on the lead, Yes / Maybe / No, "Not answered yet: LC"
 *   an organizer  → "Organizer view. 3 have not answered: RJ, LC, SN", who said yes, "Confirm these dates"
 */
export function DatesModule({ tripId, info, dates, expected, members, memberId, isOrganizer }: DatesModuleProps) {
  const [failure, setFailure] = useState<WriteResult | null>(null);
  const report = (result: WriteResult) => setFailure(result.ok ? null : result);

  const options = dates?.options ?? {};
  const answers = dates?.answers ?? {};
  const ids = Object.keys(options).sort((a, b) => options[a].from.localeCompare(options[b].from));
  const confirmedId = dates?.confirmed && options[dates.confirmed.optionId] ? dates.confirmed.optionId : null;
  const lead = confirmedId ?? mostYes(options, answers);
  const missing = notAnswered(expected, members, options, answers);
  const name = (id: MemberId) => members[id]?.name ?? expected[id] ?? id;

  if (ids.length === 0) return <p className="sub">No dates to vote on yet.</p>;

  return (
    <>
      {failure && !failure.ok && <Notice>{failure.reason === "refused" ? "This was not saved." : "No connection"}</Notice>}
      {isOrganizer && !confirmedId && (
        <Notice>
          <b>Organizer view.</b> {missing.length} have not answered: {missing.map((person) => initials(person.name)).join(", ")}
        </Notice>
      )}
      {confirmedId ? (
        <p className="dates-done">
          <Icon name="check" size={16} />
          <span>
            <b>{dayRange(options[confirmedId].from, options[confirmedId].to)}</b> · confirmed
          </span>
        </p>
      ) : (
        info && (
          <p className="sub" style={{ marginBottom: 12 }}>
            Each includes the {info.anchor.name}, {weekdayDate(info.anchor.date)}.
          </p>
        )
      )}
      {ids.map((id) => {
        const counts = summary(options[id], answers[id]);
        const saidYes = Object.entries(answers[id] ?? {})
          .filter(([, answer]) => answer === "yes")
          .map(([who]) => ({ id: who, name: name(who) }));
        return (
          <article key={id} className={`opt${id === lead ? " lead" : ""}`} aria-label={weekdayRange(options[id].from, options[id].to)}>
            <div className="top">
              <div>
                <h3>{weekdayRange(options[id].from, options[id].to)}</h3>
                <p className="meta">
                  {counts.nights} nights · {counts.yes} yes · {counts.maybe} maybe · {counts.no} no
                </p>
              </div>
              {id === lead && !confirmedId && <span className="tag acc">Most yes</span>}
            </div>
            {!confirmedId && (
              <div className="seg3" role="group" aria-label="Your answer">
                {CHOICES.map(({ answer, label }) => (
                  <button
                    key={answer}
                    type="button"
                    aria-pressed={answers[id]?.[memberId] === answer}
                    onClick={() => void saveAnswer(tripId, id, memberId, answer).then(report)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {isOrganizer && saidYes.length > 0 && (
              <div className="who" style={{ marginTop: 10 }}>
                <Avatars people={saidYes} you={memberId} />
                <span className="cap">said yes</span>
              </div>
            )}
            {isOrganizer && !confirmedId && (
              <button type="button" className={`btn sm${id === lead ? "" : " sec"}`} onClick={() => void confirmDates(tripId, id, memberId).then(report)}>
                Confirm these dates
              </button>
            )}
          </article>
        );
      })}
      {!isOrganizer && !confirmedId && missing.length > 0 && (
        <div className="dates-missing">
          <Avatars people={missing} />
          <span className="cap">Not answered yet: {missing.map((person) => initials(person.name)).join(", ")}</span>
        </div>
      )}
      {isOrganizer && confirmedId && (
        <button type="button" className="btn sm sec" onClick={() => void undoDates(tripId).then(report)}>
          Change the dates
        </button>
      )}
    </>
  );
}
