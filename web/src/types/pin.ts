/**
 * One pin on the map. The app builds pins from the trip (app/lib/pins.ts);
 * the map feature draws them and knows nothing of stays or shows.
 */
export interface Pin {
  /** Unique across kinds: "venue:savaya", "stay:<stayId>". */
  id: string;
  kind: "venue" | "stay";
  destination: string;
  name: string;
  lat: number;
  lng: number;
  /** The second line of the open card: "Club on the cliffs · next show Sat 13 Feb". */
  line: string;
}
