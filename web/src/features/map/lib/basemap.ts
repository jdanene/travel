import type { Map as MapLibreMap } from "maplibre-gl";

/**
 * The basemap: OpenFreeMap's Positron style, vector tiles drawn from
 * OpenStreetMap. It is free, needs no key or account, allows any use, and
 * serves its tiles to every origin. Attribution it asks for:
 * "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" (the style carries it).
 */
export const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

/** The source whose first tile tells the map that tiles load (case 32). */
export const BASEMAP_SOURCE = "openmaptiles";

/**
 * The app's colours for Positron, which is grey: warm land, soft teal water
 * that sits beside the accent, pale green parks, and labels in the app's
 * ink rather than black. Layer ids are Positron's; a missing layer is skipped.
 */
const PAINT: Array<[layer: string, property: string, value: string]> = [
  ["background", "background-color", "#f6f5f1"],
  ["landuse_residential", "fill-color", "#f1efea"],
  ["building", "fill-color", "#ecebe6"],
  ["park", "fill-color", "#e4ede0"],
  ["landcover_wood", "fill-color", "#dde8d8"],
  ["water", "fill-color", "#cfe4e6"],
  ["waterway", "line-color", "#bcd8dc"],
  ["water_name_point_label", "text-color", "#4f8189"],
  ["water_name_line_label", "text-color", "#4f8189"],
  ["highway-name-minor", "text-color", "#8a8a8f"],
  ["highway-name-major", "text-color", "#7a7a80"],
  ["label_other", "text-color", "#6e6e73"],
  ["label_village", "text-color", "#4a4a4f"],
  ["label_town", "text-color", "#3a3a3e"],
  ["label_state", "text-color", "#6e6e73"],
  ["label_city", "text-color", "#2c2c2e"],
  ["label_city_capital", "text-color", "#2c2c2e"],
  ["label_country_1", "text-color", "#4a4a4f"],
  ["label_country_2", "text-color", "#4a4a4f"],
  ["label_country_3", "text-color", "#4a4a4f"],
];

/** Layers that add noise at island zoom: dashed district and province lines. */
const HIDDEN = ["boundary_3", "boundary_disputed"];

/** One name per label, in English where the map has it: no Thai or Balinese second line. */
const ENGLISH_NAME = ["coalesce", ["get", "name_en"], ["get", "name:latin"], ["get", "name"]];

/**
 * Fits Positron to the app once its style has loaded: the colours above,
 * no district lines, and every place and road label in one English name.
 *
 * Inputs: map — a MapLibre map whose style has loaded.
 * Output: none; the map repaints.
 * Examples (checked at 390 px and 1650 px on the emulator):
 *   Koh Phangan → teal-grey sea, "Haad Rin" alone rather than "Haad Rin\nหาดริ้น"
 */
export function softenBasemap(map: MapLibreMap): void {
  for (const [layer, property, value] of PAINT) {
    if (map.getLayer(layer)) map.setPaintProperty(layer, property, value);
  }
  for (const layer of HIDDEN) {
    if (map.getLayer(layer)) map.setLayoutProperty(layer, "visibility", "none");
  }
  for (const layer of map.getStyle().layers) {
    if (layer.type !== "symbol" || !layer.id.match(/^(label_|water_name|waterway_line_label|highway-name|airport)/)) continue;
    map.setLayoutProperty(layer.id, "text-field", ENGLISH_NAME);
  }
}
