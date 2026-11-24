import type { MemberId, PlaceKind } from "./trip";

/**
 * One pin on the map. The app builds pins from the trip (app/lib/pins.ts);
 * the map feature draws them and knows nothing of stays or shows.
 */
export interface Pin {
  /** Unique across kinds: "venue:savaya", "stay:<stayId>". */
  id: string;
  /** "place": a friend's place from Add to map. */
  kind: "venue" | "stay" | "place";
  destination: string;
  name: string;
  lat: number;
  lng: number;
  /** The second line of the open card: "Club on the cliffs · next show Sat 13 Feb". */
  line: string;
  /** A friend's place only: what it is, for its icon. */
  icon?: PlaceKind;
  /** A friend's place only: its optional https link. */
  link?: string;
  /** A friend's place only: the member who added it, who may remove it. */
  addedBy?: MemberId;
}
