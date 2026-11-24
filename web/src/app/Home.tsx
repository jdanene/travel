import { useEffect, useRef, useState, type ReactNode } from "react";
import { FlyerHead } from "../components/FlyerHead";
import { Icon, type IconName } from "../components/Icon";
import type { Trip } from "../types/trip";
import { allSet, modules, type ModuleId } from "./lib/modules";
import "./Home.css";

/** Each module's name and icon on its button (12/2). */
const LOOK: Record<ModuleId, { name: string; icon: IconName }> = {
  dates: { name: "Dates", icon: "cal" },
  stay: { name: "Stay", icon: "bed" },
  parties: { name: "Events", icon: "music" },
  links: { name: "Links", icon: "link" },
  map: { name: "Map", icon: "map" },
};

interface HomeProps {
  trip: Trip;
  memberId: string | null;
  organizer: string | undefined;
  /** "6 of 8 replied", for the flyer's column on a desktop. */
  replied?: string;
  /**
   * What each module shows when open; each module's ticket fills it in.
   * It gets openModule, so one module can open another (the map card opens Events).
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
 * dates and every stay are confirmed. From 900 px up the flyer sits in a
 * sticky left column and the modules in the right one. An opened module
 * scrolls to the top of the window, unless its top is already near there.
 * Examples (checked on the emulator at 375 px against 12/2 and 12/3, and at 1650 px):
 *   dates open      → Dates "Tap to answer", Events, Links, Map; no Stay
 *   tap "Dates"     → Dates opens with the accent ring at the top of the window; tap again, or another module, and it closes
 *   1650 px         → the flyer on the left, the module buttons on the right
 */
export function Home({ trip, memberId, organizer, replied, content }: HomeProps) {
  const [open, setOpen] = useState<ModuleId | null>(null);
  const shown = modules(trip, memberId);
  const openId = shown.some((module) => module.id === open) ? open : null;
  const filled = content?.(setOpen) ?? {};
  const sections = useRef<Partial<Record<ModuleId, HTMLElement | null>>>({});

  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = openId && sections.current[openId];
    const below = list.current;
    if (below) below.style.paddingBottom = "";
    if (!section || !below) return;
    const top = section.getBoundingClientRect().top;
    if (top >= 0 && top < window.innerHeight * 0.2) return;
    // A module near the end of the page needs room below it to reach the top of the window.
    const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
    const room = window.scrollY + top - margin + window.innerHeight - document.documentElement.scrollHeight;
    if (room > 0) below.style.paddingBottom = `${room + parseFloat(getComputedStyle(below).paddingBottom || "0")}px`;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  }, [openId]);

  return (
    <div className="split">
      <FlyerHead organizer={organizer} info={trip.info} photo="short" replied={replied}>
        {allSet(trip) && <p className="cap all-set">All set</p>}
      </FlyerHead>
      <div className="modules" ref={list}>
        {shown.map(({ id, lines }) => {
          const isOpen = id === openId;
          return (
            <section key={id} ref={(node) => void (sections.current[id] = node)} className={`fb${isOpen ? " open" : ""}`} aria-labelledby={`fb-${id}`}>
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
    </div>
  );
}
