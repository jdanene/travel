import type { ReactNode } from "react";
import { Face, usePhoto, type Person } from "../components/Avatars";
import { Icon } from "../components/Icon";
import { Sheet } from "../components/Sheet";
import { crewCounts, type CrewList, type CrewRow } from "./lib/crewList";
import "./CrewBlock.css";

/** The most faces in the title block's stack (mock 5 draws six). */
const MOST = 6;

interface CrewTitleProps {
  list: CrewList;
  /** This device's member. */
  you: Person;
  /** A tap on your own face: the photo sheet. */
  onYou: () => void;
  /** "See the crew": opens the crew sheet. */
  onSee: () => void;
  /** Your reply buttons, drawn under the count line. */
  reply?: ReactNode;
}

/**
 * The crew in the flyer's title block (mock 5): the faces of the friends
 * who are in, in reply order, then "6 in · 1 maybe · 1 not replied" and
 * "See the crew" on one line, with your reply buttons under it. Your own face is
 * in the stack (added when you are not in) and is a button that opens your photo, with a camera badge; the
 * other faces are pictures. With just you on the trip it reads "Just you
 * so far · share the link".
 *
 * Inputs: the crew list, you, and what tapping your face and "See the crew" do.
 * Output: the block, centred under the trip's name.
 * Examples (checked on the emulator at 375 px and 1650 px):
 *   Dom, KA, TO, you, RJ, LC in; SN maybe; AJ not replied → six faces, "6 in · 1 maybe · 1 not replied", "See the crew"
 *   only you                                              → your face, "Just you so far · share the link"
 */
export function CrewTitle({ list, you, onYou, onSee, reply }: CrewTitleProps) {
  const photo = usePhoto(you.id);
  const alone = list.in.length + list.maybe.length + list.out.length <= 1;
  const others = list.in.filter((row) => row.id !== you.id);
  // Your face stays in the stack: in its reply place when it fits, else last.
  let faces: CrewRow[] = list.in.slice(0, MOST);
  if (!faces.some((row) => row.id === you.id)) faces = [...others.slice(0, MOST - 1), { id: you.id, name: you.name, line: "" }];
  const counts = crewCounts(list);

  return (
    <div className="tcrew">
      <span className="stk">
        {faces.map((row) =>
          row.id === you.id ? (
            <button key={row.id} type="button" className="tcrew-you" onClick={onYou} aria-label={photo ? "Change photo" : "Add photo"}>
              <Face person={row} className="you" />
              <span className="tcrew-cam" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" /><circle cx="12" cy="12.5" r="3.2" /></svg>
              </span>
            </button>
          ) : (
            <Face key={row.id} person={row} className="" />
          ),
        )}
      </span>
      {alone ? (
        <>
          <span className="t">Just you so far · share the link</span>
          {reply}
        </>
      ) : (
        <>
          {/* The count and its link read as one line (owner, 25 Nov 2026); your reply sits under them. */}
          <p className="tcrew-line">
            <span className="t">
              <b>{counts[0]}</b>
              {counts.slice(1).map((part) => ` · ${part}`)}
            </span>
            <button type="button" className="see" aria-haspopup="dialog" onClick={onSee}>
              See the crew
              <Icon name="chev" size={16} />
            </button>
          </p>
          {reply}
        </>
      )}
    </div>
  );
}

/**
 * "The crew · 8", the sheet behind "See the crew" (mock 5): IN, MAYBE,
 * CAN'T and NOT REPLIED, each with its count, a face, the name ("You" for
 * yourself) and the small line; an empty group says "Nobody".
 *
 * Inputs: whether it is open, the crew list, your member, and closing.
 * Output: the sheet.
 * Examples (checked on the emulator): "See the crew" → IN · 6 with Dom "organizer · 13–23 Feb · 4 events", CAN'T · 0 "Nobody"
 */
export function CrewSheet({ open, list, youId, onClose }: { open: boolean; list: CrewList; youId: string; onClose: () => void }) {
  const groups: Array<[string, CrewRow[]]> = [
    ["IN", list.in],
    ["MAYBE", list.maybe],
    ["CAN'T", list.out],
    ["NOT REPLIED", list.notReplied],
  ];
  const total = list.in.length + list.maybe.length + list.out.length + list.notReplied.length;
  return (
    <Sheet open={open} title={`The crew · ${total}`} onClose={onClose} focusFirst={false}>
      <div className="crew-sheet">
        {groups.map(([name, rows]) => (
          <section key={name} aria-label={`${name.toLowerCase()}, ${rows.length}`}>
            <p className="grp">
              {name} · {rows.length}
            </p>
            {rows.length === 0 ? (
              <p className="pr nob">Nobody</p>
            ) : (
              rows.map((row) => (
                <div key={row.id} className="pr">
                  <Face person={row} className={row.id === youId ? "you" : ""} />
                  <span>
                    <b>{row.id === youId ? "You" : row.name}</b>
                    {row.line && <small>{row.line}</small>}
                  </span>
                </div>
              ))
            )}
          </section>
        ))}
      </div>
    </Sheet>
  );
}
