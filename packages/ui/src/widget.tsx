/**
 * Embeddable map widget — a plain-JS entry point that mounts the React
 * MapView into any element, with basemap / glyphs passed as parameters.
 *
 * Built via `pnpm build:widget` (vite lib mode) into `dist/widget/map-widget.js`
 * (+ `map-widget.css`), then usable from a plain HTML page:
 *
 *   <script type="module">
 *     import { createMapWidget } from "./dist/widget/map-widget.js";
 *     const w = createMapWidget(el, { basemapUrl, glyphsUrl, markers, tracks });
 *     w.setData({ markers: [...] }); // update coordinates at runtime
 *     w.destroy();
 *   </script>
 *
 * The host page is responsible for serving the basemap (.pmtiles, HTTP Range
 * required) and the glyph PBFs — both are plain URL parameters.
 */
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { createElement } from "react";
import type { Map as MapLibreMap, MapEventType } from "maplibre-gl";
import { MapView } from "./components/ui/map-view";
import type { MarkerSpec, TrackSpec } from "./components/ui/map-view";
import "./widget.css";

export type {
  MarkerSpec,
  TrackSpec,
  MapFlavor,
} from "./components/ui/map-view";

export interface MapWidgetOptions {
  /** pmtiles:// URL of the basemap — the host must serve the file (HTTP Range). */
  basemapUrl: string;
  /** Glyphs URL template, e.g. "/glyphs/{fontstack}/{range}.pbf" or an upstream URL. */
  glyphsUrl?: string;
  /** Source attribution shown in the map control (default: PROTOMAPS_ATTRIBUTION). */
  attribution?: string;
  center?: [number, number];
  zoom?: number;
  maxBounds?: [[number, number], [number, number]];
  markers?: MarkerSpec[];
  tracks?: TrackSpec[];
  showCenterHud?: boolean;
  navControl?: boolean;
  onClick?: (e: MapEventType["click"]) => void;
  onMove?: (e: MapEventType["move"]) => void;
  onZoom?: (e: MapEventType["zoom"]) => void;
  onIdle?: (e: MapEventType["idle"]) => void;
}

export interface MapWidget {
  /** Replace markers/tracks at runtime. */
  setData(data: { markers?: MarkerSpec[]; tracks?: TrackSpec[] }): void;
  /**
   * Switch the basemap at runtime (e.g. shanghai.pmtiles → tokyo.pmtiles).
   * Changing the URL recreates the map; the new center/zoom are applied.
   */
  setBasemap(
    basemapUrl: string,
    opts?: { center?: [number, number]; zoom?: number },
  ): void;
  /** Fly the camera (queued until the map is ready). */
  flyTo(target: {
    center?: [number, number];
    zoom?: number;
    duration?: number;
  }): void;
  /** Unmount the widget and release the map. */
  destroy(): void;
}

interface WidgetState {
  markers: MarkerSpec[];
  tracks: TrackSpec[];
}

const DEFAULT_CENTER: [number, number] = [121.47, 31.23];
const DEFAULT_ZOOM = 12;

function WidgetRoot({
  options,
  state,
  onReady,
}: {
  options: MapWidgetOptions;
  state: WidgetState;
  onReady: (map: MapLibreMap) => void;
}) {
  return createElement(MapView, {
    basemap: {
      url: options.basemapUrl,
      glyphs: options.glyphsUrl,
      attribution: options.attribution,
    },
    // The host element provides the size; the MapView container fills it
    className: "h-full",
    center: options.center ?? DEFAULT_CENTER,
    zoom: options.zoom ?? DEFAULT_ZOOM,
    maxBounds: options.maxBounds,
    markers: state.markers,
    tracks: state.tracks,
    showCenterHud: options.showCenterHud,
    navControl: options.navControl,
    onMapReady: onReady,
    onClick: options.onClick,
    onMove: options.onMove,
    onZoom: options.onZoom,
    onIdle: options.onIdle,
  });
}

// A container can only ever host one React root. React 18 treats a second
// createRoot on an already-mounted container as undefined behavior: the old
// root is not unmounted, so both roots render and stack a second MapView /
// MapLibre map (duplicated attribution controls). Track roots per container
// and unmount the previous one before mounting a fresh root.
const roots = new WeakMap<HTMLElement, Root>();

export function createMapWidget(
  container: HTMLElement,
  options: MapWidgetOptions,
): MapWidget {
  roots.get(container)?.unmount();
  const root = createRoot(container);
  roots.set(container, root);
  const mapRef: { current: MapLibreMap | null } = { current: null };
  const pendingFly: Array<{
    center?: [number, number];
    zoom?: number;
    duration?: number;
  }> = [];
  const state: WidgetState = {
    markers: options.markers ?? [],
    tracks: options.tracks ?? [],
  };
  // Mutable copy so setBasemap can swap the basemap/center/zoom at runtime.
  const liveOptions: MapWidgetOptions = { ...options };
  // Basemap URL the current map was created with; a setBasemap swap makes the
  // existing map stale until the replacement is ready (see flyTo).
  let readyBasemapUrl: string | null = null;

  const render = () =>
    root.render(
      createElement(WidgetRoot, {
        options: liveOptions,
        state,
        onReady: (map) => {
          mapRef.current = map;
          readyBasemapUrl = liveOptions.basemapUrl;
          while (pendingFly.length) map.flyTo(pendingFly.shift()!);
        },
      }),
    );
  render();

  return {
    setData(next) {
      if (next.markers) state.markers = next.markers;
      if (next.tracks) state.tracks = next.tracks;
      render();
    },
    setBasemap(basemapUrl, opts) {
      liveOptions.basemapUrl = basemapUrl;
      if (opts?.center) liveOptions.center = opts.center;
      if (opts?.zoom !== undefined) liveOptions.zoom = opts.zoom;
      render();
    },
    // While a basemap swap is pending (or before the first map is ready),
    // targets are queued and replayed once the (new) map is ready — sending
    // them to the stale map would animate a dying/removed instance.
    flyTo(target) {
      const map = mapRef.current;
      if (map && readyBasemapUrl === liveOptions.basemapUrl) {
        map.flyTo(target);
      } else {
        pendingFly.push(target);
      }
    },
    destroy() {
      mapRef.current = null;
      readyBasemapUrl = null;
      pendingFly.length = 0;
      // Only clear the registry entry if it still points at this root — a
      // stale widget must never unmount (or unregister) a newer widget that
      // was created on the same container afterwards.
      if (roots.get(container) === root) roots.delete(container);
      root.unmount();
    },
  };
}
