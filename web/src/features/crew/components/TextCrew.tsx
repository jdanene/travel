import { useState, type FormEvent } from "react";
import { Notice } from "../../../components/Notice";
import { Sheet } from "../../../components/Sheet";
import type { Member, MemberId } from "../../../types/trip";
import { readPhones } from "../api/phone";
import { textCrew, type SendOutcome, type TextResult } from "../api/texts";
import { AUDIENCES, MAX_MESSAGE, MAX_RECIPIENTS, recipients, refusalWords, smsText, worstCost, type Audience } from "../lib/texts";
import "./TextCrew.css";

interface TextCrewProps {
  tripId: string;
  /** info.name, the start of every text. */
  tripName: string;
  members: Record<MemberId, Member>;
}

type Step =
  | { name: "compose" }
  | { name: "confirm"; ids: MemberId[]; retry: boolean }
  | { name: "sending"; ids: MemberId[] }
  | { name: "results"; results: TextResult[]; textsToday: number };

/** The sender's reasons for sending nothing, in the sheet's words. */
const REFUSED: Record<string, string> = {
  daily_cap: "This trip has sent its 5 texts for today. Try again tomorrow.",
  too_many: `At most ${MAX_RECIPIENTS} people per text.`,
  not_organizer: "Only an organizer can text the crew.",
  bad_token: "Your sign-in has expired. Reload the page and try again.",
  no_recipients: "Nobody in this group has a number.",
  db_failed: "The sender could not read the trip. Nothing was sent.",
  bad_request: "The sender could not read the message. Nothing was sent.",
  no_connection: "No connection. Nothing was sent.",
  not_set_up: "Texting is not set up yet. Nothing was sent.",
  signed_out: "This device is not signed in. Reload the page.",
  busy: "Another text is sending. Nothing was sent; try again in a minute.",
};

/**
 * "Text the crew": the organizer's text link at the foot of the trip page,
 * beside "Invite". Its sheet takes a message (300 characters at most,
 * with a counter), who gets it (Everyone with a number, I'm in, Maybe),
 * shows the text as a friend will read it and how many people it reaches,
 * and sends only after a confirm step that states the count and the most
 * it can cost. Then it lists each person: Sent, Not sent with AWS's reason,
 * or Not confirmed. "Send again to failed" re-sends to the "Not sent" ones,
 * by hand only: a send is paid, so nothing retries by itself.
 *
 * Friends never see it: the page renders it for an organizer only, and the
 * sender (services/travel-texts) checks again that the caller is one.
 *
 * Inputs: the trip, its name, and the crew's member records.
 * Output: the link, and the sheet while it is open. With no answer from
 * the sender, the sheet says texts may have gone and leaves sending again
 * to the organizer.
 * Examples (checked on the emulator at 375 px and 1650 px, sending against the deployed sender):
 *   3 numbers, 2 of them "I'm in", chip "I'm in"  → "Goes to 2 people."; Send → "Text 2 people? At most $0.30 …"
 *   no numbers saved                              → "Nobody in this group has a number yet."; Send disabled
 *   a refused number                              → "Not sent · Replied STOP"; "Send again to failed (1)"
 */
export function TextCrew({ tripId, tripName, members }: TextCrewProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [phones, setPhones] = useState<Record<MemberId, unknown> | null | "failed">(null);
  const [step, setStep] = useState<Step>({ name: "compose" });
  const [problem, setProblem] = useState<{ text: string; detail?: string } | null>(null);

  const start = () => {
    setStep({ name: "compose" });
    setProblem(null);
    setPhones(null);
    setOpen(true);
    void readPhones(tripId).then((result) => setPhones(result.ok ? (result.value ?? {}) : "failed"));
  };

  const ids = phones && phones !== "failed" ? recipients(audience, phones, members) : [];
  const nameOf = (id: MemberId) => members[id]?.name ?? id;

  const review = (event: FormEvent) => {
    event.preventDefault();
    setProblem(null);
    if (message.trim() && ids.length > 0 && ids.length <= MAX_RECIPIENTS) setStep({ name: "confirm", ids, retry: false });
  };

  const send = async (targets: MemberId[], retry: boolean) => {
    setStep({ name: "sending", ids: targets });
    const outcome: SendOutcome = await textCrew(tripId, message.trim(), retry ? "all" : audience, retry ? targets : undefined);
    if (outcome.ok) return setStep({ name: "results", results: outcome.results, textsToday: outcome.textsToday });
    setStep({ name: "compose" });
    if (outcome.kind === "unknown") {
      setProblem({ text: "No answer from the sender. Some texts may have gone out: ask the crew before you send again.", detail: outcome.reason });
    } else {
      setProblem({ text: REFUSED[outcome.reason] ?? "Nothing was sent.", detail: REFUSED[outcome.reason] ? undefined : outcome.reason });
    }
  };

  return (
    <>
      <button type="button" className="organizer-link" onClick={start}>
        Text the crew
      </button>
      <Sheet open={open} title="Text the crew" onClose={() => setOpen(false)}>
        {step.name === "compose" && (
          <form className="text-crew" onSubmit={review} noValidate>
            <label className="field">
              <small>Message</small>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={MAX_MESSAGE}
                rows={3}
                aria-describedby="text-count"
                enterKeyHint="enter"
              />
            </label>
            <p id="text-count" className="cap text-count" aria-live="polite">
              {message.length}/{MAX_MESSAGE}
            </p>
            <p className="sect" id="text-who">
              Who gets it
            </p>
            <div className="pills" role="group" aria-labelledby="text-who">
              {AUDIENCES.map((choice) => (
                <button
                  key={choice.audience}
                  type="button"
                  className="pill"
                  aria-pressed={audience === choice.audience}
                  onClick={() => setAudience(choice.audience)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <p className="sect">Preview</p>
            <p className="text-bubble">{smsText(tripName, message, tripId)}</p>
            <p className="text-reach" aria-live="polite">
              {reachLine(phones, ids.length)}
            </p>
            {problem && <Notice detail={problem.detail}>{problem.text}</Notice>}
            <button type="submit" className="btn" disabled={!message.trim() || ids.length === 0 || ids.length > MAX_RECIPIENTS}>
              Send
            </button>
          </form>
        )}

        {(step.name === "confirm" || step.name === "sending") && (
          <div className="text-crew text-confirm">
            <p className="text-confirm-big">
              Text {step.ids.length} {step.ids.length === 1 ? "person" : "people"}?
            </p>
            <p className="sub">
              At most {worstCost(step.ids.length)}: AWS refuses any text that costs more than $0.15. A sent text can't be taken back.
            </p>
            <p className="cap text-names">{step.ids.map(nameOf).join(", ")}</p>
            <button
              type="button"
              className="btn"
              disabled={step.name === "sending"}
              aria-busy={step.name === "sending"}
              onClick={() => step.name === "confirm" && void send(step.ids, step.retry)}
            >
              {step.name === "sending" ? "Sending…" : `Send ${step.ids.length} ${step.ids.length === 1 ? "text" : "texts"}`}
            </button>
            {step.name === "confirm" && (
              <button type="button" className="btn sec" onClick={() => setStep({ name: "compose" })}>
                Back
              </button>
            )}
          </div>
        )}

        {step.name === "results" && (
          <Results
            step={step}
            nameOf={nameOf}
            onRetry={(failed) => setStep({ name: "confirm", ids: failed, retry: true })}
            onDone={() => {
              setMessage("");
              setOpen(false);
            }}
          />
        )}
      </Sheet>
    </>
  );
}

/** The line under the preview: how many the text reaches, or why it cannot go. */
function reachLine(phones: Record<MemberId, unknown> | null | "failed", count: number): string {
  if (phones === null) return "Counting numbers…";
  if (phones === "failed") return "Could not read the crew's numbers. Close the sheet and open it again.";
  if (count === 0) return "Nobody in this group has a number yet.";
  if (count > MAX_RECIPIENTS) return `Goes to ${count} people. At most ${MAX_RECIPIENTS} per text: pick a smaller group.`;
  return `Goes to ${count} ${count === 1 ? "person" : "people"}.`;
}

/**
 * The results of one send: a summary line, one row per person, the
 * trip's texts so far today, and "Send again to failed" when AWS refused
 * any. A "Not confirmed" text is left out of the re-send: it may have gone.
 *
 * Inputs: the results step, a name lookup, and what the two buttons do.
 * Output: the results view.
 * Examples (checked on the emulator): 2 sent, 1 refused → "2 sent · 1 not sent", and "Send again to failed (1)"
 */
function Results({
  step,
  nameOf,
  onRetry,
  onDone,
}: {
  step: Extract<Step, { name: "results" }>;
  nameOf: (id: MemberId) => string;
  onRetry: (failed: MemberId[]) => void;
  onDone: () => void;
}) {
  const failed = step.results.filter((r) => r.status === "refused").map((r) => r.memberId);
  const sent = step.results.filter((r) => r.status === "sent").length;
  const unknown = step.results.length - sent - failed.length;
  return (
    <div className="text-crew">
      <p className="text-confirm-big" role="status">
        {sent} sent{failed.length > 0 && ` · ${failed.length} not sent`}
        {unknown > 0 && ` · ${unknown} not confirmed`}
      </p>
      <ul className="text-results">
        {step.results.map((r) => (
          <li key={r.memberId}>
            <b>{nameOf(r.memberId)}</b>
            <span className={`text-status ${r.status}`}>
              {r.status === "sent" ? "Sent" : r.status === "refused" ? `Not sent · ${refusalWords(r.reason)}` : "Not confirmed · it may have gone"}
            </span>
          </li>
        ))}
      </ul>
      <p className="cap">{step.textsToday} of 5 texts sent today</p>
      {failed.length > 0 && (
        <button type="button" className="btn" onClick={() => onRetry(failed)}>
          Send again to failed ({failed.length})
        </button>
      )}
      <button type="button" className={failed.length > 0 ? "btn sec" : "btn"} onClick={onDone}>
        Done
      </button>
    </div>
  );
}
