import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Notice } from "../../../components/Notice";
import type { Pin } from "../../../types/pin";
import { groupByScreen } from "../lib/fan";
import { PinCard } from "./PinCard";
import "./TripMap.css";

/** How long the map waits for a first tile before it lists the pins instead (case 32). */
const TILES_WAIT_MS = 8000;

/** The mocks' music and home symbols, as marker icons. */
const GLYPH = {
  venue: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  stay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/></svg>',
};

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export interface MapDestination {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface TripMapProps {
  destinations: MapDestination[];
  pins: Pin[];
  /** A tap on the open card. */
  onOpen: (pin: Pin) => void;
}

/**
 * The map: the one fancy thing in the app. A switch between the
 * destinations, OpenStreetMap tiles, a pin for each stay and venue, and a
 * card for the pin tapped. It draws the pins it is given and knows nothing
 * of stays or shows. Pins whose labels would overlap at the current zoom
 * show as one count pin ("3 pins") that lists them; zooming in splits it.
 *
 * Inputs: the destinations with their centres, the pins, and what a tap on
 * the card does.
 * Output: the map. Pins that collide group (case 35). Switching
 * destination closes the card. A destination with no pins says "No pins
 * yet." When no tile has loaded after 8 seconds, a notice and a plain list
 * of the pins replace the map; the list opens the same cards (case 32).
 * Examples (checked at 390 px against 12/6 and 20/10):
 *   Bali → "Bali", "Koh Phangan · 6 pins", the Bali venues; a tap on Savaya opens its card
 */
export function TripMap({ destinations, pins, onOpen }: TripMapProps) {
  const [destination, setDestination] = useState(destinations[0]?.id ?? "");
  const [selected, setSelected] = useState<string | null>(null);
  const [group, setGroup] = useState<string[] | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  const here = useMemo(() => pins.filter((pin) => pin.destination === destination), [pins, destination]);
  const count = (id: string) => pins.filter((pin) => pin.destination === id).length;
  const chosen = here.find((pin) => pin.id === selected) ?? null;
  const centre = destinations.find((candidate) => candidate.id === destination);

  useEffect(() => {
    if (!box.current) return;
    const created = L.map(box.current, { zoomControl: false, scrollWheelZoom: false });
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });
    let loaded = false;
    tiles.on("tileload", () => (loaded = true));
    tiles.addTo(created);
    const timer = setTimeout(() => !loaded && setTilesFailed(true), TILES_WAIT_MS);
    layer.current = L.layerGroup().addTo(created);
    map.current = created;
    return () => {
      clearTimeout(timer);
      created.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const current = map.current;
    if (!current || !centre) return;
    if (here.length > 1) current.fitBounds(L.latLngBounds(here.map((pin) => [pin.lat, pin.lng])), { padding: [48, 48], maxZoom: 14 });
    else current.setView(here[0] ? [here[0].lat, here[0].lng] : [centre.lat, centre.lng], here.length ? 14 : 10);
    // Fit only when the destination or the number of pins changes, not when a pin is selected.
  }, [destination, here.length]);

  /** Draws the pins at the current zoom: a pin alone as itself, colliding pins as one count pin. */
  const draw = useCallback(() => {
    const current = map.current;
    const markers = layer.current;
    if (!current || !markers) return;
    markers.clearLayers();
    const byId = new Map(here.map((pin) => [pin.id, pin]));
    const points = here.map((pin) => ({ id: pin.id, ...current.latLngToContainerPoint([pin.lat, pin.lng]) }));
    for (const found of groupByScreen(points)) {
      const first = byId.get(found.ids[0])!;
      const many = found.ids.length > 1;
      const on = found.ids.includes(selected ?? "");
      const label = many ? `${found.ids.length} pins` : escapeHtml(first.name);
      const kind = many ? "venue" : first.kind;
      const html = `<span class="mk${kind === "stay" ? " stay" : ""}${on ? " on" : ""}${many ? " many" : ""}"><i>${GLYPH[kind]}</i>${label}</span>`;
      L.marker([first.lat, first.lng], { icon: L.divIcon({ className: "", html, iconSize: [0, 0] }), title: many ? found.ids.map((id) => byId.get(id)!.name).join(", ") : first.name, keyboard: true })
        .on("click", () => {
          if (many) setGroup(found.ids);
          else {
            setGroup(null);
            setSelected(first.id);
          }
        })
        .addTo(markers);
    }
  }, [here, selected]);

  useEffect(() => {
    const current = map.current;
    if (!current) return;
    draw();
    current.on("zoomend", draw);
    return () => {
      current.off("zoomend", draw);
    };
  }, [draw, destination]);

  const choose = (id: string) => {
    setDestination(id);
    setSelected(null);
    setGroup(null);
  };
  const listed = group ? here.filter((pin) => group.includes(pin.id)) : [];

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
      <div className="map-box" ref={box} hidden={tilesFailed} aria-label={`Map of ${centre?.name ?? ""}`} />
      {here.length === 0 && <p className="sub" style={{ marginTop: 10 }}>No pins yet.</p>}
      {(tilesFailed || listed.length > 0) && (
        <div className="pin-list">
          {(tilesFailed ? here : listed).map((pin) => (
            <button key={pin.id} type="button" aria-pressed={pin.id === selected} onClick={() => setSelected(pin.id)}>
              {pin.name}
            </button>
          ))}
        </div>
      )}
      {chosen && <PinCard pin={chosen} onOpen={onOpen} />}
    </>
  );
}
