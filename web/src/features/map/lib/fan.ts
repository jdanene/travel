/** A pin's place on screen, in pixels from the map's top left. */
export interface ScreenPoint {
  id: string;
  x: number;
  y: number;
}

/** How close two pin labels may sit before they count as one spot: about one label. */
export const COLLIDE_PX = { x: 120, y: 30 };

/**
 * Groups pins whose labels would overlap on screen at the current zoom, so
 * every pin can be reached (case 35): a group shows as one count pin that
 * opens a short list, and zooming in splits it. Pins that share one spot
 * (venues at their area's centre, every stay) always group.
 *
 * Inputs: points — each pin's screen position at the current zoom, in the
 * order the pins should list.
 * Output: groups of pin ids, each with the screen point of its first pin;
 * a group of one is a pin drawn as itself.
 * Examples (checked on the map):
 *   Atlas, Desa Kitsuné and Potato Head at island zoom → one group of three
 *   the same three zoomed in to Canggu                 → three groups of one
 */
export function groupByScreen(points: ScreenPoint[]): Array<{ ids: string[]; x: number; y: number }> {
  const groups: Array<{ ids: string[]; x: number; y: number }> = [];
  for (const point of points) {
    const near = groups.find((group) => Math.abs(group.x - point.x) < COLLIDE_PX.x && Math.abs(group.y - point.y) < COLLIDE_PX.y);
    if (near) near.ids.push(point.id);
    else groups.push({ ids: [point.id], x: point.x, y: point.y });
  }
  return groups;
}

/**
 * Groups every pin of the trip for one zoom: first within each destination
 * (groupByScreen()), then groups of different destinations whose middles
 * collide merge whole. So zoomed out, a destination stays one count pin
 * ("17 in Phuket") and never splits across its neighbour; two destinations
 * close on screen read as one ("31 in Koh Phangan & Phuket").
 *
 * Inputs: points — each pin's screen position and destination, in the order the pins should list.
 * Output: groups of pin ids, each at the middle of its pins on screen.
 * Examples (each is a test in fan.test.ts):
 *   Koh Phangan's two pins and Phuket's one, 40 px apart        → one group of three
 *   the same, 400 px apart                                      → [Koh Phangan's two], [Phuket's one]
 */
export function groupPins(points: Array<ScreenPoint & { destination: string }>): Array<{ ids: string[]; x: number; y: number }> {
  const byDestination = new Map<string, ScreenPoint[]>();
  for (const point of points) byDestination.set(point.destination, [...(byDestination.get(point.destination) ?? []), point]);
  const at = new Map(points.map((point) => [point.id, point]));
  const middle = (ids: string[]) => ({
    x: ids.reduce((sum, id) => sum + at.get(id)!.x, 0) / ids.length,
    y: ids.reduce((sum, id) => sum + at.get(id)!.y, 0) / ids.length,
  });
  const merged: Array<{ ids: string[]; x: number; y: number }> = [];
  for (const group of [...byDestination.values()].flatMap((inside) => groupByScreen(inside).map(({ ids }) => ({ ids, ...middle(ids) })))) {
    const near = merged.find((other) => Math.abs(other.x - group.x) < COLLIDE_PX.x && Math.abs(other.y - group.y) < COLLIDE_PX.y);
    if (!near) merged.push(group);
    else Object.assign(near, { ids: [...near.ids, ...group.ids], ...middle([...near.ids, ...group.ids]) });
  }
  return merged;
}

/**
 * A count pin's label: the count, and the destination's name when the
 * group holds every pin of that destination and nothing else ("12 in
 * Bali"); two whole destinations that sit close read "18 in Koh Phangan &
 * Phuket". Any other group reads "3 pins".
 *
 * Inputs: members — the destination of each pin in the group;
 * totals — each destination's number of pins on the whole map;
 * names — each destination's name, in the switch's order.
 * Output: the label.
 * Examples (each is a test in fan.test.ts):
 *   12 Bali pins, Bali has 12                               → "12 in Bali"
 *   3 of Bali's 12 pins                                     → "3 pins"
 *   8 Koh Phangan and 10 Phuket pins, both whole            → "18 in Koh Phangan & Phuket"
 */
export function groupLabel(members: string[], totals: Record<string, number>, names: Array<{ id: string; name: string }>): string {
  const counts = new Map<string, number>();
  for (const destination of members) counts.set(destination, (counts.get(destination) ?? 0) + 1);
  const whole = [...counts].every(([destination, count]) => totals[destination] === count);
  const named = names.filter((place) => counts.has(place.id)).map((place) => place.name);
  if (!whole || named.length !== counts.size) return `${members.length} pins`;
  const list = named.length === 1 ? named[0] : `${named.slice(0, -1).join(", ")} & ${named[named.length - 1]}`;
  return `${members.length} in ${list}`;
}
