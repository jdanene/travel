import { useState } from "react";
import { Icon } from "../../../components/Icon";
import { Notice } from "../../../components/Notice";
import type { WriteResult } from "../../../lib/db";
import type { LinkItem, Links, MemberId } from "../../../types/trip";
import { addLink, removeLink } from "../api/links";
import { AddLinkSheet } from "./AddLinkSheet";
import { LinkCard } from "./LinkCard";
import "./Links.css";

interface LinksModuleProps {
  tripId: string;
  links: Links | undefined;
  destinations: Array<{ id: string; name: string }>;
  names: Record<MemberId, string>;
  memberId: MemberId;
  isOrganizer: boolean;
}

/**
 * The Links module: the crew's bucket for cool finds on Instagram and
 * TikTok, grouped by destination, newest first (exception 3: the mocks do
 * not draw it). Open from the start, like Parties.
 *
 * Inputs: the trip, the links branch, the destinations, the crew's names,
 * this member, and whether it is an organizer.
 * Output: the groups with their cards, "No links yet." when there are none
 * (case 49), and "Add a link". "Remove" shows on a friend's own cards, and
 * on every card for an organizer (case 48).
 * Examples (checked at 390 px on the emulator): one TikTok for Bali → "Bali", its card, "Add a link"
 */
export function LinksModule({ tripId, links, destinations, names, memberId, isOrganizer }: LinksModuleProps) {
  const [adding, setAdding] = useState(false);
  const [failure, setFailure] = useState<WriteResult | null>(null);
  const report = (result: WriteResult) => setFailure(result.ok ? null : result);

  const items = links?.items ?? {};
  const show = (id: string) =>
    requestAnimationFrame(() => document.getElementById(`link-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  const add = async (id: string, item: LinkItem) => {
    const result = await addLink(tripId, id, item);
    if (!result.ok && result.reason === "failed") report(result);
    return result.ok;
  };

  return (
    <>
      {failure && !failure.ok && <Notice>{failure.reason === "refused" ? "This was not saved." : "No connection"}</Notice>}
      {Object.keys(items).length === 0 && <p className="sub">No links yet.</p>}
      {destinations.map((place) => {
        const ids = Object.keys(items)
          .filter((id) => items[id].destination === place.id)
          .sort((a, b) => items[b].at - items[a].at);
        if (ids.length === 0) return null;
        return (
          <section key={place.id} aria-labelledby={`links-${place.id}`}>
            <h3 id={`links-${place.id}`} className="sect" style={{ margin: "12px 0 2px" }}>
              {place.name}
            </h3>
            {ids.map((id) => (
              <LinkCard
                key={id}
                id={id}
                item={items[id]}
                addedBy={names[items[id].addedBy] ?? items[id].addedBy}
                onRemove={items[id].addedBy === memberId || isOrganizer ? () => void removeLink(tripId, id).then(report) : undefined}
              />
            ))}
          </section>
        );
      })}
      <button type="button" className="btn sec links-add" onClick={() => setAdding(true)}>
        <Icon name="link" />
        Add a link
      </button>
      <AddLinkSheet
        open={adding}
        destinations={destinations}
        known={Object.keys(items)}
        memberId={memberId}
        onClose={() => setAdding(false)}
        onAdd={add}
        onShow={show}
      />
    </>
  );
}
