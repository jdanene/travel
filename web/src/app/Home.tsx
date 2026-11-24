import { useState, type ReactNode } from "react";
import { FlyerHead } from "../components/FlyerHead";
import { Icon, type IconName } from "../components/Icon";
import type { Trip } from "../types/trip";
import { allSet, modules, type ModuleId } from "./lib/modules";
import "./Home.css";

/** Each module's name and icon on its button (12/2). */
const LOOK: Record<ModuleId, { name: string; icon: IconName }> = {
  dates: { name: "Dates", icon: "cal" },
  stay: { name: "Stay", icon: "bed" },
  parties: { name: "Parties", icon: "music" },
  links: { name: "Links", icon: "link" },
  map: { name: "Map", icon: "map" },
};

interface HomeProps {
  trip: Trip;
  memberId: string | null;
  organizer: string | undefined;
  /**
   * What each module shows when open; each module's ticket fills it in.
   * It gets openModule, so one module can open another (the map card opens Parties).
   */
  content?: (openModule: (id: ModuleId) => void) => Partial<Record<ModuleId, ReactNode>>;
}

/**
 * Screen 12/2, the home page: the flyer head, then one button per module,
 * equal in size, in a fixed order that means nothing. A button opens its
 * module in place (12/3); one is open at a time, and all start closed.
 * A closed button shows its state on the right.
 *
 * Inputs: the trip, this device's member, the organizer's name, and each
 * module's open content.
 * Output: the home page. "All set" shows under the date line once the
 * dates and every stay are confirmed.
 * Examples (checked at 390 px against 12/2 and 12/3):
 *   dates open      → Dates "Tap to answer", Parties, Links, Map; no Stay
 *   tap "Dates"     → Dates opens with the accent ring; tap again, or another module, and it closes
 */
export function Home({ trip, memberId, organizer, content }: HomeProps) {
  const [open, setOpen] = useState<ModuleId | null>(null);
  const shown = modules(trip, memberId);
  const openId = shown.some((module) => module.id === open) ? open : null;
  const filled = content?.(setOpen) ?? {};

  return (
    <>
      <FlyerHead organizer={organizer} info={trip.info}>
        {allSet(trip) && <p className="cap all-set">All set</p>}
      </FlyerHead>
      <div className="modules">
        {shown.map(({ id, lines }) => {
          const isOpen = id === openId;
          return (
            <section key={id} className={`fb${isOpen ? " open" : ""}`} aria-labelledby={`fb-${id}`}>
              <button
                type="button"
                id={`fb-${id}`}
                className="fb-head"
                aria-expanded={isOpen}
                aria-controls={`fb-body-${id}`}
                onClick={() => setOpen(isOpen ? null : id)}
              >
                <span className="fb-name">
                  <Icon name={LOOK[id].icon} />
                  <b>{LOOK[id].name}</b>
                </span>
                {isOpen ? (
                  <span className="close">
                    <Icon name="close" size={18} />
                  </span>
                ) : (
                  <span className="fb-state">
                    {lines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </span>
                )}
              </button>
              {isOpen && (
                <div className="fb-body" id={`fb-body-${id}`}>
                  {filled[id]}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
