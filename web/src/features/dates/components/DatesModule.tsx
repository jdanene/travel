import { useState } from "react";
import { Avatars } from "../../../components/Avatars";
import { Icon } from "../../../components/Icon";
import { Notice } from "../../../components/Notice";
import type { WriteResult } from "../../../lib/db";
import { dayRange, weekdayRange, stayLength } from "../../../lib/format";
import { initials } from "../../../lib/initials";
import type { Answer, Dates, Member, MemberId, TripInfo } from "../../../types/trip";
import { dateOptionId } from "../../../lib/ids";
import { addOption, confirmDates, removeOption, saveAnswer, undoDates } from "../api/dates";
import { mostYes, notAnswered, summary } from "../lib/dates";
import { AddDatesSheet } from "./AddDatesSheet";
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
 * A friend answers each option in one tap and sees the counts move, and
 * adds their own range with "Add dates"; it shows for everyone at once,
 * sorted by its first day, with "added by" on it. The organizer also sees who said
 * yes, who has not answered, and confirms one option; after the confirm
 * the module still opens, shows the counts and takes no new answers or
 * dates, and the organizer can undo it.
 *
 * Inputs: the trip id and info, the dates branch, the crew as plain data,
 * this device's member, and whether it is an organizer.
 * Output: the module's content. No options: "No dates to vote on yet." and
 * "Add dates". The adder, or an organizer, sees "Remove" on an option while
 * nobody else has voted on it and it is not confirmed.
 * Examples (checked on the emulator at 375 px and 1650 px against 20/2 and 20/3, in the frame of 12/3):
 *   a friend      → option cards, "Most yes" on the lead, Yes / Maybe / No, "Add dates", "Not answered yet: LC"
 *   KA adds 18–24 Feb → a card "Thu 18 – Wed 24 Feb", "… · added by KA", KA's Yes, on every phone
 *   an organizer  → "Organizer view. 3 have not answered: RJ, LC, SN", who said yes, "Confirm these dates"
 */
export function DatesModule({ tripId, info, dates, expected, members, memberId, isOrganizer }: DatesModuleProps) {
  const [failure, setFailure] = useState<WriteResult | null>(null);
  const [adding, setAdding] = useState(false);
  const report = (result: WriteResult) => setFailure(result.ok ? null : result);

  const options = dates?.options ?? {};
  const answers = dates?.answers ?? {};
  const ids = Object.keys(options).sort((a, b) => options[a].from.localeCompare(options[b].from) || options[a].to.localeCompare(options[b].to));
  const confirmedId = dates?.confirmed && options[dates.confirmed.optionId] ? dates.confirmed.optionId : null;
  const lead = confirmedId ?? mostYes(options, answers);
  const missing = notAnswered(expected, members, options, answers);
  const name = (id: MemberId) => members[id]?.name ?? expected[id] ?? id;

  const show = (id: string) =>
    requestAnimationFrame(() => document.getElementById(`date-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  const add = async (from: string, to: string) => {
    const id = dateOptionId(from, to);
    const result = await addOption(tripId, from, to, memberId, options[id] !== undefined);
    report(result);
    if (!result.ok) return;
    setAdding(false);
    show(id);
  };

  return (
    <>
      {failure && !failure.ok && <Notice>{failure.reason === "refused" ? "This was not saved." : "No connection"}</Notice>}
      {isOrganizer && !confirmedId && ids.length > 0 && (
        <Notice>
          <b>Organizer view.</b> {missing.length} have not answered: {missing.map((person) => initials(person.name)).join(", ")}
        </Notice>
      )}
      {confirmedId && (
        <p className="dates-done">
          <Icon name="check" size={16} />
          <span>
            <b>{dayRange(options[confirmedId].from, options[confirmedId].to)}</b> · confirmed
          </span>
        </p>
      )}
      {ids.length === 0 && <p className="sub">No dates to vote on yet.</p>}
      {ids.map((id) => {
        const option = options[id];
        const counts = summary(option, answers[id]);
        const saidYes = Object.entries(answers[id] ?? {})
          .filter(([, answer]) => answer === "yes")
          .map(([who]) => ({ id: who, name: name(who) }));
        const adder = option.addedBy === undefined ? null : option.addedBy === memberId ? "you" : initials(name(option.addedBy));
        const othersVoted = Object.keys(answers[id] ?? {}).some((who) => who !== option.addedBy);
        const removable = !confirmedId && !othersVoted && (isOrganizer || (option.addedBy !== undefined && option.addedBy === memberId));
        return (
          <article key={id} id={`date-${id}`} className={`opt${id === lead ? " lead" : ""}`} aria-label={weekdayRange(option.from, option.to)}>
            <div className="top">
              <div>
                <h3>{weekdayRange(option.from, option.to)}</h3>
                <p className="meta">
                  {/* No-break spaces keep each count with its word when the line wraps. */}
                  {`${stayLength(counts.nights)} · ${counts.yes}\u00a0yes · ${counts.maybe}\u00a0maybe · ${counts.no}\u00a0no`}
                  {adder && ` · added\u00a0by\u00a0${adder}`}
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
            {(isOrganizer && !confirmedId) || removable ? (
              <div className="opt-actions">
                {isOrganizer && !confirmedId && (
                  <button type="button" className={`btn sm${id === lead ? "" : " sec"}`} onClick={() => void confirmDates(tripId, id, memberId).then(report)}>
                    Confirm these dates
                  </button>
                )}
                {removable && (
                  <button type="button" className="remove" aria-label={`Remove ${weekdayRange(option.from, option.to)}`} onClick={() => void removeOption(tripId, id).then(report)}>
                    Remove
                  </button>
                )}
              </div>
            ) : null}
          </article>
        );
      })}
      {!confirmedId && info && (
        <button type="button" className="btn sec dates-add" onClick={() => setAdding(true)}>
          <Icon name="plus" />
          Add dates
        </button>
      )}
      {!isOrganizer && !confirmedId && ids.length > 0 && missing.length > 0 && (
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
      {info && <AddDatesSheet open={adding} season={info.season} onClose={() => setAdding(false)} onAdd={add} />}
    </>
  );
}
