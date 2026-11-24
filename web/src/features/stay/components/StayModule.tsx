import { useState } from "react";
import { Icon } from "../../../components/Icon";
import { idFromName } from "../../../lib/ids";
import { Notice } from "../../../components/Notice";
import type { WriteResult } from "../../../lib/db";
import type { Area, MemberId, Stay, StayOption } from "../../../types/trip";
import { addStay, setHeart } from "../api/stay";
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
}

/**
 * The Stay module, open in place: the places friends added, grouped by
 * city, with hearts. No steps and no confirm (owner, 24 Nov 2026: "don't
 * put structure"): anyone adds a place in any city, with dates if they
 * have them, and hearts the ones they like.
 *
 * Inputs: the trip, the stay branch, the destinations and their areas, the
 * crew's names, and this member.
 * Output: one group per city that has a place (the trip's destinations
 * first, then other cities in the order they were added), or "No places
 * yet.", then "Add a place".
 * Examples (checked at 390 px):
 *   a villa in Bali and a hotel in Bangkok → "Bali" with the villa, "Bangkok" with the hotel, "Add a place"
 */
export function StayModule({ tripId, stay, destinations, areas, names, memberId }: StayModuleProps) {
  const [adding, setAdding] = useState(false);
  const [failure, setFailure] = useState<WriteResult | null>(null);
  const report = (result: WriteResult) => setFailure(result.ok ? null : result);

  const options = stay?.options ?? {};
  const hearts = stay?.hearts ?? {};
  // A place's city: the one the friend gave, else its destination's name (places added before cities).
  const cityOf = (option: StayOption) => option.city ?? destinations.find((place) => place.id === option.destination)?.name ?? option.area;
  const added = Object.values(options)
    .sort((a, b) => a.at - b.at)
    .map(cityOf);
  const cities = [...new Map([...destinations.map((place) => place.name), ...added].map((name) => [idFromName(name), name])).values()];
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
      <p className="sub" style={{ marginBottom: 4 }}>
        Heart the places you like.
      </p>
      {Object.keys(options).length === 0 && <p className="sub">No places yet.</p>}
      {cities.map((city) => {
        const key = idFromName(city);
        const ids = Object.keys(options)
          .filter((id) => idFromName(cityOf(options[id])) === key)
          .sort((a, b) => Object.keys(hearts[b] ?? {}).length - Object.keys(hearts[a] ?? {}).length || options[a].at - options[b].at);
        if (ids.length === 0) return null;
        return (
          <section key={key} aria-labelledby={`stay-${key}`}>
            <h3 id={`stay-${key}`} className="sect" style={{ margin: "12px 0 2px" }}>
              {city}
            </h3>
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
                />
              ))}
            </div>
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
        cities={cities}
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
