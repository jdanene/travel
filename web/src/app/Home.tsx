import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Person } from "../components/Avatars";
import { FlyerHead } from "../components/FlyerHead";
import { Icon, type IconName } from "../components/Icon";
import type { Trip } from "../types/trip";
import { allSet, modules, type ModuleId } from "./lib/modules";
import "./Home.css";

/** How long a module takes to open or shut: Home.css's .fb-fold transition. */
const FOLD_MS = 220;

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
  organizer: Person | undefined;
  /** This device's member; a tap on their face on the flyer calls onYou. */
  you?: Person;
  onYou?: () => void;
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
 * Inputs: the trip, this device's member, the organizer, what a tap on
 * your own face does, and each module's open content.
 * Output: the home page. "All set" shows under the date line once the
 * dates and every stay are confirmed. From 900 px up the flyer sits in a
 * sticky left column and the modules in the right one. An opened module
 * scrolls to the top of the window, unless its top is already near there.
 * A module eases open and shut in about 220 ms (its body fades, the close
 * mark turns in); closing one while opening another runs together, and the
 * scroll aims where the opened module will stand once both finish. With
 * prefers-reduced-motion it opens and shuts at once.
 * Examples (checked on the emulator at 375 px against 12/2 and 12/3, and at 1650 px):
 *   dates open      → Dates "Tap to answer", Events, Links, Map; no Stay
 *   tap "Dates"     → Dates eases open at the top of the window; tap again, or another module, and it eases shut
 *   Dates open, tap "Map" → Dates folds as Map unfolds; Map ends at the top of the window, the warm map already drawn
 *   1650 px         → the flyer on the left, the module buttons on the right
 */
export function Home({ trip, memberId, organizer, you, onYou, replied, content }: HomeProps) {
  const [open, setOpen] = useState<ModuleId | null>(null);
  // The fold that stands open (one frame behind `open`, so the browser draws it shut first), and the one still closing.
  const [shownId, setShownId] = useState<ModuleId | null>(null);
  const [leaving, setLeaving] = useState<ModuleId | null>(null);
  const shown = modules(trip, memberId);
  const openId = shown.some((module) => module.id === open) ? open : null;
  const sections = useRef<Partial<Record<ModuleId, HTMLElement | null>>>({});
  const list = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const toggle = (id: ModuleId | null) => {
    if (id === open) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLeaving(still ? null : open);
    if (still) setShownId(id);
    setOpen(id);
    // The closing body goes once its fold is shut; a timer, since transitionend never comes in a hidden tab.
    window.clearTimeout(leaveTimer.current);
    if (!still && open) leaveTimer.current = window.setTimeout(() => setLeaving(null), FOLD_MS + 40);
  };
  const filled = content?.(toggle) ?? {};

  useEffect(() => {
    const fold = openId && sections.current[openId]?.querySelector<HTMLElement>(".fb-fold");
    if (fold) void fold.offsetHeight; // Draw the fold shut once, so the switch to open eases.
    setShownId(openId);
  }, [openId]);

  useEffect(() => {
    const section = openId && sections.current[openId];
    const below = list.current;
    if (below) below.style.paddingBottom = "";
    if (!section || !below) return;
    // The page as it will stand once the folds finish: the closing module gives back its body.
    const closing = leaving && leaving !== openId ? sections.current[leaving]?.querySelector<HTMLElement>(".fb-fold") : null;
    const shrink = closing?.getBoundingClientRect().height ?? 0;
    const shrinkAbove = closing && closing.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING ? shrink : 0;
    const top = section.getBoundingClientRect().top - shrinkAbove;
    // Already near the top once the folds finish: stay, but keep the page long enough to hold this place.
    const near = top >= 0 && top < window.innerHeight * 0.2;
    const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
    const target = near ? window.scrollY : window.scrollY + top - margin;
    // A module near the end of the page needs room below it to reach the top of the window. While the folds move,
    // the page is never shorter than with the closing body gone and the opening one at its present height; the room
    // is measured again once they finish, so no extra space stays below.
    const makeRoom = () => {
      below.style.paddingBottom = "";
      const closingNow = closing?.isConnected ? closing.getBoundingClientRect().height : 0;
      const room = target + window.innerHeight - (document.documentElement.scrollHeight - closingNow);
      if (room > 0) below.style.paddingBottom = `${room + parseFloat(getComputedStyle(below).paddingBottom || "0")}px`;
    };
    makeRoom();
    const settle = window.setTimeout(makeRoom, FOLD_MS + 60);
    if (!near) {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: target, behavior: still ? "auto" : "smooth" });
    }
    return () => window.clearTimeout(settle);
    // Measured once per opening; `leaving` is set in the same tap.
  }, [openId]);

  return (
    <div className="split">
      <FlyerHead organizer={organizer} you={you} onYou={onYou} info={trip.info} photo="short" replied={replied}>
        {allSet(trip) && <p className="cap all-set">All set</p>}
      </FlyerHead>
      <div className="modules" ref={list}>
        {shown.map(({ id, lines }) => {
          const isOpen = id === openId;
          const drawn = isOpen || id === leaving;
          return (
            <section
              key={id}
              ref={(node) => void (sections.current[id] = node)}
              className={`fb${isOpen ? " open" : ""}${isOpen && shownId === id ? " shown" : ""}`}
              aria-labelledby={`fb-${id}`}
            >
              <button
                type="button"
                id={`fb-${id}`}
                className="fb-head"
                aria-expanded={isOpen}
                aria-controls={`fb-body-${id}`}
                onClick={() => toggle(isOpen ? null : id)}
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
              {drawn && (
                <div className="fb-fold" id={`fb-body-${id}`}>
                  <div className="fb-fold-in">
                    <div className="fb-body">{filled[id]}</div>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
