import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../../components/Icon";
import { Notice } from "../../../components/Notice";
import { PlaceSearch } from "../../../components/PlaceSearch";
import type { WriteResult } from "../../../lib/db";
import type { PlaceHit } from "../../../lib/placeSearch";
import type { Pin } from "../../../types/pin";
import type { MemberId, PlaceKind } from "../../../types/trip";
import { addPlace, newPlaceId, removePlace } from "../api/places";
import { BASEMAP_SOURCE, BASEMAP_STYLE, softenBasemap } from "../lib/basemap";
import { groupByScreen } from "../lib/fan";
import { destinationBox, insideDestination } from "../lib/places";
import { AddPlaceForm } from "./AddPlaceForm";
import { PinCard } from "./PinCard";
import "./TripMap.css";

/** How long the map waits for a first tile before it lists the pins instead (case 32). */
const TILES_WAIT_MS = 8000;

/** The pin icons: the mocks' music and home symbols, and one per kind of friend's place, drawn at one stroke. */
const GLYPH: Record<"venue" | "stay" | PlaceKind, string> = {
  venue: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  stay: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
  event: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  food: '<path d="M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3M17.5 21V3c-2.4 1.3-3.5 4-3.5 7.5V13h3.5"/>',
  beach: '<path d="M12 4a8.5 8.5 0 0 1 8.5 8.5h-17A8.5 8.5 0 0 1 12 4zM12 12.5V19a2 2 0 0 0 4 0"/>',
  activity: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  other: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
};
const glyph = (key: keyof typeof GLYPH) => `<svg viewBox="0 0 24 24" aria-hidden="true">${GLYPH[key]}</svg>`;

/** The longest pin label, in characters; a longer name is cut with "…", and the open card shows it whole. */
const LABEL_MAX = 22;

/**
 * A pin's label: the name cut to 22 characters with an ellipsis, so a long
 * name stays inside the map.
 *
 * Inputs: name — the pin's name.
 * Output: the name, or its first 21 characters (trailing space dropped) and "…".
 * Examples (checked on the map):
 *   "Savaya"                                          → "Savaya"
 *   "Little Country Houses – Finley's Fort + hot tub" → "Little Country Houses…"
 */
const pinLabel = (name: string) => (name.length <= LABEL_MAX ? name : `${name.slice(0, LABEL_MAX - 1).trimEnd()}…`);

export interface MapDestination {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface TripMapProps {
  tripId: string;
  destinations: MapDestination[];
  pins: Pin[];
  /** This device's member; null before the friend joins, and then there is no "Add to map". */
  memberId: MemberId | null;
  isOrganizer: boolean;
  /** A tap on the open card. */
  onOpen: (pin: Pin) => void;
  /** A pin to open on: the map starts on its destination, centred on it, with its card open. */
  focus?: string;
}

/**
 * The map: the one fancy thing in the app. A switch between the
 * destinations, a calm vector basemap (OpenFreeMap Positron in the app's
 * colours), a white pill pin for each stay and venue, and a card for the
 * pin tapped; the open pin fills with the accent. The camera flies to a
 * destination and to an opened pin, and jumps instead when the device asks
 * for reduced motion. It draws the pins it is given and knows nothing
 * of stays or shows. Pins whose labels would overlap at the current zoom
 * show as one count pin ("3 pins") that lists them; zooming in splits it.
 *
 * Inputs: the trip, the destinations with their centres, the pins, this
 * member and whether it is an organizer, what a tap on the card does, and a
 * pin to start on (the show sheet's "See on the map"). Only the first value
 * of focus counts; the map is mounted afresh each time its module opens.
 * Output: the map. Pins that collide group (case 35). Switching
 * destination closes the card. A destination with no pins says "No pins
 * yet." "Add to map" puts a friend's place on the map: a search for the
 * place by name ("Search for a place"); a pick drops a crosshair pin there,
 * fills the name and flies to it; "Can't find it? Tap the map instead"
 * leaves tapping, and a tap anywhere on the map moves the pin. The pin
 * drags. A spot outside the destination says "Tap a spot in Bali." and
 * moves nothing. The fields under the map save it; "Cancel" or switching
 * destination ends adding. The new pin shows at once, with its card open;
 * with no connection it shows here and reaches the others when the connection
 * is back. When no tile has loaded after 8 seconds, or the device cannot draw
 * the map (no WebGL), a notice and a plain list of the pins replace the
 * map; the list opens the same cards (case 32).
 * Examples (checked at 390 px against 12/6 and 20/10):
 *   Bali → "Bali", "Koh Phangan · 6 pins", the Bali venues; a tap on Savaya opens its card
 *   Add to map, "single fin", pick "Single Fin · Pecatu", Food, Add → its pin and card "Food · added by KA"
 *   focus "venue:eden-garden" → Koh Phangan, zoomed on Eden Garden, its card open
 */
export function TripMap({ tripId, destinations, pins, memberId, isOrganizer, onOpen, focus }: TripMapProps) {
  const start = useRef(pins.find((pin) => pin.id === focus));
  const [destination, setDestination] = useState(start.current?.destination ?? destinations[0]?.id ?? "");
  const [selected, setSelected] = useState<string | null>(start.current?.id ?? null);
  const [group, setGroup] = useState<string[] | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [spot, setSpot] = useState<{ lat: number; lng: number } | null>(null);
  const [outside, setOutside] = useState(false);
  const [tapping, setTapping] = useState(false);
  const [picked, setPicked] = useState({ name: "", key: 0 });
  const [failure, setFailure] = useState<WriteResult | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const framed = useRef<{ destination: string; count: number } | null>(null);
  const aim = useRef<Marker | null>(null);

  const here = useMemo(() => pins.filter((pin) => pin.destination === destination), [pins, destination]);
  const count = (id: string) => pins.filter((pin) => pin.destination === id).length;
  const chosen = here.find((pin) => pin.id === selected) ?? null;
  const centre = destinations.find((candidate) => candidate.id === destination);

  useEffect(() => {
    if (!box.current || !centre) return;
    let created: MapLibreMap;
    try {
      created = new maplibregl.Map({
        container: box.current,
        style: BASEMAP_STYLE,
        center: [centre.lng, centre.lat],
        zoom: 10,
        attributionControl: false,
        scrollZoom: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        renderWorldCopies: false,
      });
    } catch {
      setTilesFailed(true); // No WebGL: the list stands in for the map.
      return;
    }
    created.touchZoomRotate.disableRotation();
    created.keyboard.disableRotation();
    created.addControl(new maplibregl.AttributionControl({ compact: false }), "bottom-right");
    created.on("style.load", () => softenBasemap(created));
    let loaded = false;
    created.on("data", (event) => {
      if (event.dataType === "source" && "sourceId" in event && event.sourceId === BASEMAP_SOURCE && "tile" in event && event.tile) loaded = true;
    });
    const timer = setTimeout(() => !loaded && setTilesFailed(true), TILES_WAIT_MS);
    map.current = created;
    return () => {
      clearTimeout(timer);
      created.remove();
      map.current = null;
    };
    // The map is made once; the camera effect below follows the destination.
  }, []);

  useEffect(() => {
    const current = map.current;
    if (!current || !centre) return;
    // A pin added or removed here keeps the camera where the friend is looking.
    const last = framed.current;
    if (last && last.destination === destination && last.count > 0) return void (framed.current = { destination, count: here.length });
    // The show sheet's "See on the map" starts centred on its venue.
    const target = here.find((pin) => pin.id === start.current?.id);
    const camera = target
      ? { center: [target.lng, target.lat] as [number, number], zoom: 15 }
      : here.length > 1
        ? current.cameraForBounds(
            here.reduce((bounds, pin) => bounds.extend([pin.lng, pin.lat]), new maplibregl.LngLatBounds([here[0].lng, here[0].lat], [here[0].lng, here[0].lat])),
            { padding: 56, maxZoom: 14 },
          )
        : { center: here[0] ? ([here[0].lng, here[0].lat] as [number, number]) : ([centre.lng, centre.lat] as [number, number]), zoom: here.length ? 14 : 10 };
    if (!camera) return;
    // The first frame jumps; switching destination flies.
    move(current, camera, last ? 1600 : 0);
    framed.current = { destination, count: here.length };
    // Frame when the destination changes, or when its first pins arrive; not when a pin is selected, added or removed.
  }, [destination, here.length]);

  /** Draws the pins at the current zoom: a pin alone as itself, colliding pins as one count pin. */
  const draw = useCallback(() => {
    const current = map.current;
    if (!current) return;
    for (const marker of markers.current) marker.remove();
    const byId = new Map(here.map((pin) => [pin.id, pin]));
    const points = here.map((pin) => ({ id: pin.id, ...current.project([pin.lng, pin.lat]) }));
    markers.current = groupByScreen(points).map((found) => {
      const first = byId.get(found.ids[0])!;
      const many = found.ids.length > 1;
      const on = found.ids.includes(selected ?? "");
      const element = pinElement({
        glyph: glyph(many ? "other" : first.kind === "place" ? (first.icon ?? "other") : first.kind),
        label: many ? `${found.ids.length} pins` : pinLabel(first.name),
        title: many ? found.ids.map((id) => byId.get(id)!.name).join(", ") : first.name,
        many,
        on,
      });
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        if (many) setGroup(found.ids);
        else open(first);
      });
      return new maplibregl.Marker({ element, anchor: "center" }).setLngLat([first.lng, first.lat]).addTo(current);
    });
  }, [here, selected]);

  useEffect(() => {
    const current = map.current;
    if (!current) return;
    draw();
    current.on("moveend", draw);
    return () => {
      current.off("moveend", draw);
    };
  }, [draw]);

  /**
   * Puts the new place's pin at a spot when it lies inside the destination;
   * outside, it says so and the pin stays where it was.
   */
  const placeAt = useCallback(
    ({ lat, lng }: { lat: number; lng: number }) => {
      const inside = insideDestination(destination, lat, lng);
      setOutside(!inside);
      if (inside) setSpot({ lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 });
      else setSpot((last) => (last ? { ...last } : last)); // a pin dragged outside snaps back to the last good spot
    },
    [destination],
  );

  // Adding: a tap on the map puts the pin there (the fallback to the search).
  useEffect(() => {
    const current = map.current;
    if (!current || !placing) return;
    const tap = (event: maplibregl.MapMouseEvent) => placeAt(event.lngLat);
    current.on("click", tap);
    current.getCanvas().style.cursor = "crosshair";
    return () => {
      current.off("click", tap);
      aim.current?.remove();
      aim.current = null;
      current.getCanvas().style.cursor = "";
    };
  }, [placing, placeAt]);

  // The new place's pin: a crosshair that drags, wherever the spot is.
  useEffect(() => {
    const current = map.current;
    if (!current || !placing || !spot) return;
    if (!aim.current) {
      const element = document.createElement("div");
      element.className = "mk-aim";
      element.setAttribute("aria-hidden", "true");
      const marker = new maplibregl.Marker({ element, anchor: "center", draggable: true }).setLngLat([spot.lng, spot.lat]).addTo(current);
      marker.on("dragend", () => placeAt(marker.getLngLat()));
      aim.current = marker;
    }
    aim.current.setLngLat([spot.lng, spot.lat]);
  }, [placing, spot, placeAt]);

  const stopPlacing = () => {
    setPlacing(false);
    setSpot(null);
    setOutside(false);
    setTapping(false);
  };

  /** A suggestion picked: the pin drops there, the name fills in, and the map flies to it. */
  const pick = (hit: PlaceHit) => {
    setPicked({ name: hit.name, key: picked.key + 1 });
    placeAt(hit);
    const current = map.current;
    if (current) move(current, { center: [hit.lng, hit.lat], zoom: Math.max(current.getZoom(), 15) }, 900);
  };

  /** "Can't find it? Tap the map instead": the line above the map asks for the tap. */
  const tapInstead = () => {
    setTapping(true);
    box.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  };

  const report = (result: WriteResult) => setFailure(result.ok ? null : result);

  /** Saves the friend's place at the spot tapped and opens its card; the pin shows at once. */
  const add = (place: { name: string; kind: PlaceKind; link?: string }) => {
    if (!spot || !memberId) return;
    const id = newPlaceId();
    void addPlace(tripId, id, { ...place, destination, lat: spot.lat, lng: spot.lng, addedBy: memberId, at: Date.now() }).then(report);
    stopPlacing();
    setGroup(null);
    setSelected(`place:${id}`);
  };

  const remove = (pin: Pin) => {
    setSelected(null);
    void removePlace(tripId, pin.id.slice("place:".length)).then(report);
  };
  const removable = (pin: Pin) => pin.kind === "place" && memberId !== null && (pin.addedBy === memberId || isOrganizer);

  /** Opens a pin's card and brings the pin to the middle, close enough that it stands alone. */
  const open = (pin: Pin) => {
    setGroup(null);
    setSelected(pin.id);
    const current = map.current;
    if (current) move(current, { center: [pin.lng, pin.lat], zoom: Math.max(current.getZoom(), 14) }, 900);
  };

  const choose = (id: string) => {
    stopPlacing();
    start.current = undefined;
    setDestination(id);
    setSelected(null);
    setGroup(null);
  };
  const listed = group ? here.filter((pin) => group.includes(pin.id)) : [];
  const searchBox = destinationBox(destination);
  const hint = !placing
    ? null
    : outside
      ? `Tap a spot in ${centre?.name ?? "the map"}.`
      : spot
        ? "Drag the pin to move it."
        : tapping || !searchBox
          ? "Tap the map where it is."
          : null;

  return (
    <>
      <div className="pills map-pills" role="group" aria-label="Destination">
        {destinations.map((place) => (
          <button key={place.id} type="button" className="pill" aria-pressed={place.id === destination} onClick={() => choose(place.id)}>
            {place.id === destination ? place.name : `${place.name} · ${count(place.id)} pins`}
          </button>
        ))}
      </div>
      {tilesFailed && <Notice>No connection</Notice>}
      {failure && !failure.ok && <Notice>{failure.reason === "refused" ? "This was not saved." : "No connection"}</Notice>}
      {placing && searchBox && centre && (
        <PlaceSearch key={destination} box={searchBox} near={centre} onPick={pick} onTapInstead={tapInstead} />
      )}
      {hint && (
        <p className={`map-hint${outside ? " off" : ""}`} role={outside ? "alert" : "status"}>
          {hint}
        </p>
      )}
      <div className={`map-box${placing ? " placing" : ""}`} hidden={tilesFailed} role="region" aria-label={`Map of ${centre?.name ?? ""}`}>
        {/* MapLibre owns this element's classes, so React sets none on it. */}
        <div className="map-gl" ref={box} />
      </div>
      {here.length === 0 && !placing && <p className="sub" style={{ marginTop: 10 }}>No pins yet.</p>}
      {(tilesFailed || listed.length > 0) && (
        <div className="pin-list">
          {(tilesFailed ? here : listed).map((pin) => (
            <button key={pin.id} type="button" aria-pressed={pin.id === selected} onClick={() => open(pin)}>
              {pin.name}
            </button>
          ))}
        </div>
      )}
      {placing && spot && <AddPlaceForm key={picked.key} initialName={picked.name} onAdd={add} />}
      {chosen && !placing && <PinCard pin={chosen} onOpen={onOpen} onRemove={removable(chosen) ? () => remove(chosen) : undefined} />}
      {memberId && !tilesFailed && (
        <button
          type="button"
          className="btn sec map-add"
          onClick={() => {
            if (placing) return stopPlacing();
            setSelected(null);
            setGroup(null);
            setFailure(null);
            setPlacing(true);
          }}
        >
          {!placing && <Icon name="plus" />}
          {placing ? "Cancel" : "Add to map"}
        </button>
      )}
    </>
  );
}

/**
 * Moves the camera: a smooth flight, or a jump when the device asks for
 * reduced motion or the duration is 0.
 *
 * Inputs: map, the target centre and zoom, and the flight's length in ms.
 * Output: none; the map moves and fires "moveend", which redraws the pins.
 * Examples (checked on screen): Bali → Koh Phangan flies; with reduced motion it jumps.
 */
function move(map: MapLibreMap, camera: maplibregl.CameraOptions, duration: number) {
  const still = duration === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still) map.jumpTo(camera);
  else map.flyTo({ ...camera, duration, essential: false, curve: 1.3 });
}

/**
 * One pin on the map: a white pill with the kind's icon and the name; the
 * open pin fills with the accent; a count pin ("3 pins") shows its icon on
 * the accent. A button, so it takes focus and Enter.
 *
 * Inputs: the icon's SVG, the label, the full name(s) for the tooltip and screen
 * readers, whether it is a count pin, and whether it holds the open pin.
 * Output: the element MapLibre places; MapLibre owns its transform.
 * Examples (checked at 390 px): Savaya, closed → white pill, green note icon, "Savaya"
 */
function pinElement({ glyph, label, title, many, on }: { glyph: string; label: string; title: string; many: boolean; on: boolean }) {
  const element = document.createElement("div");
  element.className = `mk-at${on ? " on" : ""}`;
  const button = document.createElement("button");
  button.type = "button";
  button.className = `mk${on ? " on" : ""}${many ? " many" : ""}`;
  button.title = title;
  button.setAttribute("aria-label", many ? `${label}: ${title}` : title);
  if (on) button.setAttribute("aria-pressed", "true");
  const icon = document.createElement("i");
  icon.innerHTML = glyph;
  const text = document.createElement("span");
  text.textContent = label;
  button.append(icon, text);
  element.append(button);
  return element;
}
