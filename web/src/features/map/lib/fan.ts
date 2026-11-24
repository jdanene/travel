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
