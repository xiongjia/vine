import { layers, namedFlavor } from "@protomaps/basemaps";
import type { StyleSpecification } from "maplibre-gl";

export type MapFlavor = "light" | "dark" | "white" | "black" | "grayscale";

export interface ProtomapsBasemapOptions {
  /** pmtiles:// URL of the basemap file. */
  url: string;
  flavor?: MapFlavor;
  /** Label language, e.g. "zh". */
  lang?: string;
  /**
   * Glyphs URL template, served locally by the vite glyph-proxy plugin by
   * default. Embedders can point it at their own font server
   * (or an upstream like `https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf`).
   */
  glyphs?: string;
  /**
   * Source attribution shown in the map control. Defaults to
   * `PROTOMAPS_ATTRIBUTION`; callers can override it at init time.
   */
  attribution?: string;
}

export const PROTOMAPS_ATTRIBUTION = "Learning demo · © OpenStreetMap contributors / Protomaps";

/**
 * Build the full MapLibre style for a Protomaps basemap.
 * - Glyphs are served locally (same origin) by the vite glyph-proxy plugin.
 * - No external `sprite` on purpose: sprite icons (POI glyphs etc.) are
 *   skipped, keeping every non-tile request local. Layer colors still follow
 *   the flavor via namedFlavor().
 */
export function createProtomapsStyle({
  url,
  flavor = "light",
  lang = "zh",
  glyphs = "/glyphs/{fontstack}/{range}.pbf",
  attribution = PROTOMAPS_ATTRIBUTION,
}: ProtomapsBasemapOptions): StyleSpecification {
  return {
    version: 8,
    glyphs,
    sources: {
      protomaps: {
        type: "vector",
        url,
        attribution,
      },
    },
    layers: layers("protomaps", namedFlavor(flavor), { lang }),
  };
}
