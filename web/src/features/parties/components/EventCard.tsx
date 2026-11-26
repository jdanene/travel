import { PhotoCard } from "./PhotoCard";

/**
 * The event's wide card: its picture (PhotoCard) with the artist's name
 * over its foot on a dark fade that reads on any photo. With no picture
 * left, the card is plain white with the name in ink.
 *
 * Inputs: photos — the pictures in order of preference (the event's, the
 * venue's), https only, any of them absent; artist.
 * Output: the card, with the artist as the page's h2.
 * Examples (checked on the emulator): Peggy Gou's flyer → the flyer, white name; a flyer that answers 404 → Savaya's picture; none → the plain card
 */
export function EventCard({ photos, artist }: { photos: Array<string | undefined>; artist: string }) {
  return (
    <PhotoCard photos={photos} className="event-card">
      <h2 className="event-artist" id="event-artist">
        {artist}
      </h2>
    </PhotoCard>
  );
}
