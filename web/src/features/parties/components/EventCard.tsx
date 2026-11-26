import { PhotoCard } from "./PhotoCard";

/**
 * The event's wide card: its picture (PhotoCard) with the artist's name
 * over its foot on a dark fade that reads on any photo. With no picture
 * left, the card is plain white with the name in ink.
 *
 * The shared event page and the in-app event sheet both open with it.
 *
 * Inputs: photos — the pictures in order of preference (the event's, the
 * venue's), https only, any of them absent; artist; headingId — given, the
 * name is the page's h2 with that id; absent (the sheet, whose dialog is
 * already named by its own hidden title), it is drawn text that screen
 * readers skip, so the name is heard once.
 * Output: the card.
 * Examples (checked on the emulator at 390 px and 1650 px): Peggy Gou's flyer → the flyer, white name; a flyer that answers 404 → Savaya's picture; none → the plain card
 */
export function EventCard({ photos, artist, headingId }: { photos: Array<string | undefined>; artist: string; headingId?: string }) {
  return (
    <PhotoCard photos={photos} className="event-card">
      {headingId ? (
        <h2 className="event-artist" id={headingId}>
          {artist}
        </h2>
      ) : (
        <p className="event-artist" aria-hidden="true">
          {artist}
        </p>
      )}
    </PhotoCard>
  );
}
