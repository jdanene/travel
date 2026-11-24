import { useState } from "react";
import { Icon } from "../../../components/Icon";
import { Notice } from "../../../components/Notice";
import type { WriteResult } from "../../../lib/db";
import type { Area, MemberId, Stay, StayOption } from "../../../types/trip";
import { addStay, confirmStay, setHeart, undoStay } from "../api/stay";
import { AddPlaceSheet } from "./AddPlaceSheet";
import { StayCard } from "./StayCard";
import "./Stay.css";

interface StayModuleProps {
  tripId: string;
  stay: Stay | undefined;
  destinations: Array<{ id: string; name: string }>;
  areas: Area[];
  /** Member id to name, for "added by" and the hearts. */
  names: Record<MemberId, string>;
  memberId: MemberId;
  isOrganizer: boolean;
}

/**
 * The Stay module, open in place (frame 12/4, content 20/4 to 20/6). It
 * exists only once the dates are confirmed (case 42). Friends heart the
 * places they like and add one by link; the organizer confirms one stay
 * for each destination and can undo it. Hearts stay open after a confirm.
 *
 * Inputs: the trip, the stay branch, the destinations and their areas, the
 * crew's names, this member, and whether it is an organizer.
 * Output: one group per destination, each with its cards or "No places
 * yet." (case 9), then "Add a place".
 * Examples (checked at 390 px against 20/4 and 20/6, in the frame of 12/4):
 *   a friend     → "Heart the places you like.", Bali and Koh Phangan groups, hearts, "Add a place"
 *   an organizer → "Confirm this stay" on each card of an open destination; "Change the stay" after
 */
export function StayModule({ tripId, stay, destinations, areas, names, memberId, isOrganizer }: StayModuleProps) {
  const [adding, setAdding] = useState(false);
  const [failure, setFailure] = useState<WriteResult | null>(null);
  const report = (result: WriteResult) => setFailure(result.ok ? null : result);

  const options = stay?.options ?? {};
  const hearts = stay?.hearts ?? {};
  const confirmed = stay?.confirmed ?? {};
  const show = (id: string) =>
    requestAnimationFrame(() => document.getElementById(`stay-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));

  const add = async (id: string, option: StayOption) => {
    const result = await addStay(tripId, id, option);
    if (!result.ok && result.reason === "failed") report(result);
    return result.ok;
  };

  return (
    <>
      {failure && !failure.ok && <Notice>{failure.reason === "refused" ? "This was not saved." : "No connection"}</Notice>}
      {isOrganizer && <Notice><b>Organizer view.</b></Notice>}
      <p className="sub" style={{ marginBottom: 4 }}>
        Heart the places you like.
      </p>
      {destinations.map((place) => {
        const ids = Object.keys(options)
          .filter((id) => options[id].destination === place.id)
          .sort((a, b) => Object.keys(hearts[b] ?? {}).length - Object.keys(hearts[a] ?? {}).length || options[a].at - options[b].at);
        const chosen = confirmed[place.id]?.stayId;
        return (
          <section key={place.id} aria-labelledby={`stay-${place.id}`}>
            <h3 id={`stay-${place.id}`} className="sect" style={{ margin: "12px 0 2px" }}>
              {place.name}
            </h3>
            {chosen && options[chosen] && (
              <p className="stay-done">
                <Icon name="check" size={16} />
                <span>
                  <b>{options[chosen].name}</b> · confirmed
                </span>
              </p>
            )}
            {ids.length === 0 && <p className="sub">No places yet.</p>}
            <div className="stay-grid">
              {ids.map((id) => (
                <StayCard
                  key={id}
                  id={id}
                  option={options[id]}
                  addedBy={names[options[id].addedBy] ?? options[id].addedBy}
                  hearted={Object.keys(hearts[id] ?? {}).map((who) => ({ id: who, name: names[who] ?? who }))}
                  you={memberId}
                  onHeart={(on) => void setHeart(tripId, id, memberId, on).then(report)}
                  onConfirm={isOrganizer && !chosen ? () => void confirmStay(tripId, place.id, id, options[id].name, memberId).then(report) : undefined}
                />
              ))}
            </div>
            {isOrganizer && chosen && (
              <button type="button" className="btn sm sec" onClick={() => void undoStay(tripId, place.id).then(report)}>
                Change the stay
              </button>
            )}
          </section>
        );
      })}
      <button type="button" className="btn sec stay-add" onClick={() => setAdding(true)}>
        <Icon name="link" />
        Add a place
      </button>
      <AddPlaceSheet
        open={adding}
        destinations={destinations}
        areas={areas}
        known={Object.keys(options)}
        memberId={memberId}
        onClose={() => setAdding(false)}
        onAdd={add}
        onShow={show}
      />
    </>
  );
}
