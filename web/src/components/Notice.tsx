import type { ReactNode } from "react";
import "./Notice.css";

interface NoticeProps {
  /** The line itself. Bold the lead words with <b>, as "Organizer view." on screen 3. */
  children: ReactNode;
  /** A smaller second line, for a reason such as an error code. */
  detail?: string;
  /** Shows a "Try again" button that calls this. */
  onRetry?: () => void;
}

/**
 * One line that tells the friend something the page cannot show by itself:
 * a failure, or the organizer's line. Every notice in the app uses it, in
 * the look of the organizer line on screen 3.
 *
 * Inputs: the line, an optional detail, and an optional retry action.
 * Output: a live region, so a screen reader reads a notice that appears.
 * Examples (checked on screen):
 *   <Notice>No connection</Notice>
 *   <Notice detail="auth/network-request-failed" onRetry={retry}>No connection</Notice>
 */
export function Notice({ children, detail, onRetry }: NoticeProps) {
  return (
    <div className="notice" role="status">
      <span className="notice-text">
        {children}
        {detail && <span className="notice-detail">{detail}</span>}
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
