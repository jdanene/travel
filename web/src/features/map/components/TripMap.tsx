import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../../components/Icon";
import { Notice } from "../../../components/Notice";
import { PlaceSearch } from "../../../components/PlaceSearch";
import type { WriteResult } from "../../../lib/db";
import { newPlaceId } from "../../../lib/ids";
import { nearestDestination, type PlaceHit } from "../../../lib/placeSearch";
import type { Pin } from "../../../types/pin";
import type { MemberId, PlaceKind } from "../../../types/trip";
import { addPlace, removePlace } from "../api/places";
import { BASEMAP_SOURCE, BASEMAP_STYLE, softenBasemap } from "../lib/basemap";
import { groupLabel, groupPins } from "../lib/fan";
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
 * The map: the one fancy thing in the app. Every pin of the trip at once
 * (owner, 24 Nov 2026: "If I zoom out on the map to see Thailand, the
 * Philippines and Bali, I expect all the events to show too"), on a calm
 * vector basemap (OpenFreeMap Positron in the app's colours): a white pill
 * pin for each stay, venue and friend's place, and a card for the pin
 * tapped; the open pin fills with the accent. The destination chips and
 * "All" only move the camera: a chip fits its destination's pins, "All"
 * fits every pin; no pin ever hides. Pins whose labels would overlap at the
 * current zoom show as one count pin: "12 in Bali" when it holds a whole
 * destination, else "3 pins". A tap on a count pin zooms in until it
 * splits; pins on one spot list under the map instead. The camera flies,
 * and jumps when the device asks for reduced motion. It draws the pins it
 * is given and knows nothing of stays or shows.
 *
 * Inputs: the trip, the destinations with their centres, the pins, this
 * member and whether it is an organizer, what a tap on the card does, and a
 * pin to start on (the show sheet's "See on the map"). Only the first value
 * of focus counts; the map is mounted afresh each time its module opens.
 * Output: the map. Pins that collide group (case 35). A chip closes the
 * card. A destination with no pins says "No pins yet." Opening a pin in
 * another destination flies there and moves the chip. "Add to map" puts a
 * friend's place on the map: a search for the
 * place by name ("Search for a place"), anywhere in the world, matches
 * near the trip first; a pick drops a crosshair pin there, fills the name
 * and flies to it; "Can't find it? Tap the map instead" leaves tapping, and
 * a tap anywhere on the map moves the pin. The pin drags. The place groups
 * under the trip's nearest destination; when that is another one, the
 * chip moves to it and the camera stays on the new pin. The fields under
 * the map save it; "Cancel" or a chip ends adding. The new pin shows at
 * once, with its card open;
 * with no connection it shows here and reaches the others when the connection
 * is back. When no tile has loaded after 8 seconds, or the device cannot draw
 * the map (no WebGL), a notice and a plain list of the pins replace the
 * map; the list opens the same cards (case 32).
 * Examples (checked at 375 and 1650 px against the live trip):
 *   opens on Bali → "Bali", "Koh Phangan · N pins", …, "All · N pins"; Bali's pins, Savaya among them
 *   "All", or pinch out to Thailand and Bali → one count pin per destination, "N in Bali", "N in Koh Phangan"
 *   a tap on "N in Bali" → the camera fits Bali and the pins split
 *   focus "venue:haad-rin-beach" → Koh Phangan, zoomed on Haad Rin Beach, its card open
 */
/** A map made ahead of time, waiting out of sight; TripMap moves it in when the Map module opens. */
interface Held {
  map: MapLibreMap;
  el: HTMLDivElement;
  /** Whether a first basemap tile has arrived. */
  loaded: boolean;
}
let parked: Held | null = null;

/** The out-of-sight box a waiting map sits in, at the size of the Map module on a phone. */
function park(): HTMLDivElement {
  let box = document.getElementById("map-park") as HTMLDivElement | null;
  if (!box) {
    box = document.createElement("div");
    box.id = "map-park";
    box.setAttribute("aria-hidden", "true");
    box.inert = true;
    document.body.append(box);
  }
  return box;
}

/**
 * Makes the map with the app's gestures (owner, 24 Nov 2026: "should be able to zoom in and out on the map with
 * fingers, both on computer and cell"): one-finger drag and two-finger pinch on a phone, trackpad pinch, two-finger
 * scroll and the mouse wheel on a computer, double-click and double-tap zoom, and + / − buttons. No rotation, no tilt.
 * Inputs: the element to draw in and the destination to start on.
 * Output: the map. It throws when the device has no WebGL.
 */
function makeMap(el: HTMLDivElement, centre: { lat: number; lng: number }): MapLibreMap {
  const made = new maplibregl.Map({
    container: el,
    style: BASEMAP_STYLE,
    center: [centre.lng, centre.lat],
    zoom: 10,
    attributionControl: false,
    scrollZoom: true,
    dragPan: true,
    doubleClickZoom: true,
    touchZoomRotate: true,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    renderWorldCopies: false,
  });
  made.touchZoomRotate.disableRotation();
  made.keyboard.disableRotation();
  made.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  made.addControl(new maplibregl.AttributionControl({ compact: false }), "bottom-right");
  made.on("style.load", () => softenBasemap(made));
  return made;
}

/** Marks the held map loaded when its first basemap tile arrives. */
function watchTiles(held: Held): void {
  held.map.on("data", (event) => {
    if (event.dataType === "source" && "sourceId" in event && event.sourceId === BASEMAP_SOURCE && "tile" in event && event.tile) held.loaded = true;
  });
}

/**
 * Makes the map ahead of time, out of sight, so the Map module opens at once
 * (owner, 24 Nov 2026: "Don't lazy load the map"). The trip page calls it
 * when the browser is idle after the trip is drawn; the style and the first
 * tiles of the first destination load then. A second call does nothing.
 *
 * Inputs: centre — the first destination.
 * Output: nothing. A device without WebGL keeps nothing; TripMap then shows the list.
 * Examples (checked on the emulator): the trip drawn → a second later the Bali tiles are in; Map opens with them drawn
 */
export function warmMap(centre: { lat: number; lng: number }): void {
  if (parked) return;
  const el = document.createElement("div");
  el.className = "map-fill";
  park().append(el);
  try {
    parked = { map: makeMap(el, centre), el, loaded: false };
  } catch {
    el.remove();
    return;
  }
  watchTiles(parked);
}

/** The chip that fits the camera to every pin of the trip. */
const ALL = "all";

/** The most names a count pin's tooltip lists before "and 7 more". */
const TITLE_NAMES = 5;

/** The bounds around some places, for cameraForBounds. */
const around = (spots: Array<{ lat: number; lng: number }>) =>
  spots.reduce((bounds, spot) => bounds.extend([spot.lng, spot.lat]), new maplibregl.LngLatBounds([spots[0].lng, spots[0].lat], [spots[0].lng, spots[0].lat]));

/** Whether pins sit on one spot (venues at their area's centre, every stay), so no zoom splits them. */
const oneSpot = (spots: Pin[]) => spots.every((spot) => Math.abs(spot.lat - spots[0].lat) < 1e-4 && Math.abs(spot.lng - spots[0].lng) < 1e-4);

export function TripMap({ tripId, destinations, pins, memberId, isOrganizer, onOpen, focus }: TripMapProps) {
  const start = useRef(pins.find((pin) => pin.id === focus));
  const [view, setView] = useState(start.current?.destination ?? destinations[0]?.id ?? "");
  const [selected, setSelected] = useState<string | null>(start.current?.id ?? null);
  const [group, setGroup] = useState<string[] | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [spot, setSpot] = useState<{ lat: number; lng: number } | null>(null);
  const [tapping, setTapping] = useState(false);
  const [picked, setPicked] = useState({ name: "", key: 0 });
  const [failure, setFailure] = useState<WriteResult | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const framed = useRef(false);
  const aim = useRef<Marker | null>(null);
  const row = useRef<HTMLDivElement>(null);

  // Every pin of the trip, in the switch's order of destinations, so a whole destination groups as one.
  const ordered = useMemo(() => {
    const rank = new Map(destinations.map((place, index) => [place.id, index]));
    return [...pins].sort((a, b) => (rank.get(a.destination) ?? destinations.length) - (rank.get(b.destination) ?? destinations.length));
  }, [pins, destinations]);
  const totals = useMemo(() => {
    const counted: Record<string, number> = {};
    for (const pin of pins) counted[pin.destination] = (counted[pin.destination] ?? 0) + 1;
    return counted;
  }, [pins]);
  const count = (id: string) => (id === ALL ? pins.length : (totals[id] ?? 0));
  const chosen = pins.find((pin) => pin.id === selected) ?? null;
  const centre = destinations.find((candidate) => candidate.id === view) ?? destinations[0];

  useEffect(() => {
    if (!box.current || !centre) return;
    // The map made ahead of time (warmMap) is moved in, already drawn; else one is made now.
    let holder = parked;
    parked = null;
    if (!holder) {
      const el = document.createElement("div");
      el.className = "map-fill";
      try {
        holder = { map: makeMap(el, centre), el, loaded: false };
      } catch {
        setTilesFailed(true); // No WebGL: the list stands in for the map.
        return;
      }
      watchTiles(holder);
    }
    const kept = holder;
    const created = kept.map;
    box.current.prepend(kept.el);
    created.resize();
    created.jumpTo({ center: [centre.lng, centre.lat], zoom: 10 });
    // The box changes size with the window and when the module opens; the map follows it.
    const resized = new ResizeObserver(() => created.resize());
    resized.observe(box.current);
    const timer = setTimeout(() => !kept.loaded && setTilesFailed(true), TILES_WAIT_MS);
    map.current = created;
    return () => {
      clearTimeout(timer);
      resized.disconnect();
      map.current = null;
      framed.current = false;
      for (const marker of markers.current) marker.remove();
      markers.current = [];
      // Kept for the next opening, out of sight, so the Map opens at once every time.
      park().append(kept.el);
      parked = kept;
    };
    // The map is made once; the chips and the pins move the camera.
  }, []);

  /**
   * Fits the camera to a destination's pins, or to every pin for "All"; a
   * destination with no pins shows its centre. Pins outside stay on the map.
   */
  const frame = (target: string, duration: number) => {
    const current = map.current;
    if (!current) return;
    const inside = target === ALL ? pins : pins.filter((pin) => pin.destination === target);
    const spots: Array<{ lat: number; lng: number }> = inside.length ? inside : destinations.filter((place) => target === ALL || place.id === target);
    if (spots.length === 0) return;
    const camera =
      spots.length > 1
        ? current.cameraForBounds(around(spots), { padding: target === ALL ? { top: 48, bottom: 48, left: 88, right: 88 } : 56, maxZoom: 14 })
        : { center: [spots[0].lng, spots[0].lat] as [number, number], zoom: inside.length ? 14 : 10 };
    if (camera) move(current, camera, duration);
  };

  // The first frame, once the pins are in: on the focus pin (the show sheet's "See on the map", a club tapped in Events),
  // else the destination. Zoom 12 shows the pin among its neighbours and the stays (owner, 25 Nov 2026: "so I can see
  // where it is in relation to other places"); the friend zooms in from there.
  useEffect(() => {
    if (!map.current || framed.current || pins.length === 0) return;
    framed.current = true;
    const target = pins.find((pin) => pin.id === focus);
    if (!target) return frame(view, 0);
    setView(target.destination);
    setSelected(target.id);
    move(map.current, { center: [target.lng, target.lat], zoom: 12 }, 0);
  }, [pins.length > 0]);

  /** Draws every pin at the current zoom: a pin alone as itself, colliding pins as one count pin. */
  const draw = useCallback(() => {
    const current = map.current;
    if (!current) return;
    for (const marker of markers.current) marker.remove();
    const byId = new Map(ordered.map((pin) => [pin.id, pin]));
    const points = ordered.map((pin) => ({ id: pin.id, destination: pin.destination, ...current.project([pin.lng, pin.lat]) }));
    markers.current = groupPins(points).map((found) => {
      const members = found.ids.map((id) => byId.get(id)!);
      const first = members[0];
      const many = members.length > 1;
      const names = members.map((pin) => pin.name);
      const title = names.length > TITLE_NAMES ? `${names.slice(0, TITLE_NAMES).join(", ")} and ${names.length - TITLE_NAMES} more` : names.join(", ");
      const element = pinElement({
        glyph: glyph(many ? "other" : first.kind === "place" ? (first.icon ?? "other") : first.kind),
        label: many ? groupLabel(members.map((pin) => pin.destination), totals, destinations) : pinLabel(first.name),
        title,
        many,
        on: found.ids.includes(selected ?? ""),
      });
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        if (many) zoomInto(members);
        else open(first);
      });
      // A count pin sits at the middle of its pins.
      return new maplibregl.Marker({ element, anchor: "center" }).setLngLat(many ? current.unproject([found.x, found.y]) : [first.lng, first.lat]).addTo(current);
    });
  }, [ordered, totals, destinations, selected, view]);

  useEffect(() => {
    const current = map.current;
    if (!current) return;
    draw();
    current.on("moveend", draw);
    return () => {
      current.off("moveend", draw);
    };
  }, [draw]);

  // On a phone the chips scroll sideways: keep the picked one in sight, as the Events chips do.
  useEffect(() => {
    const picked = row.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!picked || !row.current) return;
    const box = row.current.getBoundingClientRect();
    const chip = picked.getBoundingClientRect();
    if (chip.left < box.left || chip.right > box.right) row.current.scrollLeft += chip.left - box.left - (box.width - chip.width) / 2;
  }, [view]);

  /** Puts the new place's pin at a spot, anywhere in the world. */
  const placeAt = useCallback(({ lat, lng }: { lat: number; lng: number }) => setSpot({ lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 }), []);

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

  /**
   * Saves the friend's place at the spot and opens its card; the pin shows
   * at once. It groups under the nearest destination; when that is not the
   * one on screen, the switch moves to it without framing it, and the
   * camera goes to the new pin.
   */
  const add = (place: { name: string; kind: PlaceKind; link?: string; description?: string; photo?: string }) => {
    if (!spot || !memberId) return;
    const id = newPlaceId();
    const home = nearestDestination(destinations, spot) ?? view;
    void addPlace(tripId, id, { ...place, destination: home, lat: spot.lat, lng: spot.lng, addedBy: memberId, at: Date.now() }).then(report);
    stopPlacing();
    setGroup(null);
    setSelected(`place:${id}`);
    if (home !== view) setView(home);
    const current = map.current;
    if (current) move(current, { center: [spot.lng, spot.lat], zoom: Math.max(current.getZoom(), 15) }, 900);
  };

  const remove = (pin: Pin) => {
    setSelected(null);
    void removePlace(tripId, pin.id.slice("place:".length)).then(report);
  };
  const removable = (pin: Pin) => pin.kind === "place" && memberId !== null && (pin.addedBy === memberId || isOrganizer);

  /**
   * Opens a pin's card and brings the pin to the middle, close enough that
   * it stands alone; a pin in another destination flies there and moves the switch.
   */
  const open = (pin: Pin) => {
    setGroup(null);
    setSelected(pin.id);
    const far = pin.destination !== view;
    setView(pin.destination);
    const current = map.current;
    if (current) move(current, { center: [pin.lng, pin.lat], zoom: Math.max(current.getZoom(), 14) }, far ? 1600 : 900);
  };

  /**
   * A tap on a count pin: the camera fits its pins, which splits it; pins on
   * one spot, or too close for any zoom to split, are listed under the map instead.
   */
  const zoomInto = (members: Pin[]) => {
    const current = map.current;
    if (!current) return;
    const camera = oneSpot(members) ? undefined : current.cameraForBounds(around(members), { padding: 64, maxZoom: 16 });
    if (!camera || (camera.zoom ?? 0) - current.getZoom() < 0.5) return setGroup(members.map((pin) => pin.id));
    setGroup(null);
    const home = members[0].destination;
    if (members.every((pin) => pin.destination === home)) setView(home);
    move(current, camera, 900);
  };

  /** A chip: the camera fits that destination, or every pin for "All". No pin hides. */
  const choose = (id: string) => {
    stopPlacing();
    setView(id);
    setSelected(null);
    setGroup(null);
    frame(id, 1600);
  };
  const listed = group ? ordered.filter((pin) => group.includes(pin.id)) : [];
  const inView = count(view);
  const hint = !placing ? null : spot ? "Drag the pin to move it." : tapping ? "Tap the map where it is." : null;
  /** Suggestions lean toward what the map shows, else the destination's centre. */
  const near = () => {
    const view = map.current?.getCenter();
    return view ? { lat: view.lat, lng: view.lng } : { lat: centre?.lat ?? 0, lng: centre?.lng ?? 0 };
  };

  return (
    <>
      <div ref={row} className="pills map-pills" role="group" aria-label="Destination">
        {[...destinations, { id: ALL, name: "All" }].map((place) => (
          <button key={place.id} type="button" className="pill" aria-pressed={place.id === view} onClick={() => choose(place.id)}>
            {place.id === view ? place.name : `${place.name} · ${count(place.id)} ${count(place.id) === 1 ? "pin" : "pins"}`}
          </button>
        ))}
      </div>
      {tilesFailed && <Notice>No connection</Notice>}
      {failure && !failure.ok && <Notice>{failure.reason === "refused" ? "This was not saved." : "No connection"}</Notice>}
      {placing && <PlaceSearch key={view} near={near} region={destinations} onPick={pick} onTapInstead={tapInstead} />}
      {hint && (
        <p className="map-hint" role="status">
          {hint}
        </p>
      )}
      <div className={`map-box${placing ? " placing" : ""}`} hidden={tilesFailed} role="region" aria-label={view === ALL ? "Map of the trip" : `Map of ${centre?.name ?? ""}`}>
        {/* MapLibre owns this element's classes, so React sets none on it. */}
        <div className="map-gl" ref={box} />
      </div>
      {inView === 0 && !placing && <p className="sub" style={{ marginTop: 10 }}>No pins yet.</p>}
      {(tilesFailed || listed.length > 0) && (
        <div className="pin-list">
          {(tilesFailed ? ordered : listed).map((pin) => (
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
