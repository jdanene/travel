import { useState } from "react";
import { Notice } from "../../../components/Notice";
import { signInAsOrganizer, type OrganizerSignInResult } from "../api/crew";
import "./OrganizerSignIn.css";

type Failure = Extract<OrganizerSignInResult, { ok: false }>;

/** What each failure says, and whether "Try again" can help (design/app/README.md, exception 7). */
const SAYS: Record<Failure["reason"], { line: string; retry: boolean }> = {
  closed: { line: "The Google window was closed or blocked.", retry: true },
  offline: { line: "No connection", retry: true },
  disabled: { line: "Google sign-in is not turned on for this app.", retry: false },
  other: { line: "Sign-in did not work.", retry: true },
  refused: { line: "This account is not an organizer of this trip.", retry: false },
  failed: { line: "This was not saved.", retry: true },
};

/**
 * "Organizer sign-in": a quiet text link at the foot of the trip page. The
 * organizer taps it, picks a Google account, and, when its email is on the
 * trip's admin list, this device becomes an organizer on any phone (D15).
 * Friends never need it, so it stays small and last.
 *
 * Inputs: the trip.
 * Output: the link and, after a failure, one notice with the reason (and
 * the SDK's code) above it. Where trying again can help, the notice holds
 * "Try again" and the link hides, so there is one action. While the Google
 * window is open the link is disabled. The page drops this component once
 * the device is an organizer.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   a friend's page, before or after the reply → "Organizer sign-in" under everything else
 *   a sign-in error (no auth domain, since fixed) → "Sign-in did not work." · auth/auth-domain-config-required · "Try again"
 */
export function OrganizerSignIn({ tripId }: { tripId: string }) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  const start = () => {
    setBusy(true);
    setFailure(null);
    void signInAsOrganizer(tripId).then((result) => {
      setBusy(false);
      setFailure(result.ok ? null : result);
    });
  };

  const says = failure ? SAYS[failure.reason] : null;
  return (
    <div className="organizer-foot">
      {failure && says && (
        <Notice detail={failure.code} onRetry={says.retry ? start : undefined}>
          {says.line}
        </Notice>
      )}
      {!says?.retry && (
        <button type="button" className="organizer-link" onClick={start} disabled={busy} aria-busy={busy}>
          Organizer sign-in
        </button>
      )}
    </div>
  );
}
