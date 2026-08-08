import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, MapEventType } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapInstance } from "../../lib/map/hooks/use-map-instance";
import { toMarkerFeature, toTrackFeature } from "../../lib/map/geojson";
import { syncMarkerLayer } from "../../lib/map/layers/marker-layer";
import { syncTrackLayer } from "../../lib/map/layers/track-layer";
import type { MapFlavor } from "../../lib/map/basemap/protomaps";
import type { MarkerSpec, TrackSpec } from "../../lib/map/specs";

// Public API kept here for backwards compatibility (specs live in lib/map).
export type { MarkerSpec, TrackSpec } from "../../lib/map/specs";
export type { MapFlavor } from "../../lib/map/basemap/protomaps";

export interface MapViewProps {
  basemap: {
    /** pmtiles:// URL of the basemap file. */
    url: string;
    flavor?: MapFlavor;
    /** Label language, e.g. "zh". */
    lang?: string;
    /** Glyphs URL template (default: local `/glyphs/...`, see basemap/protomaps.ts). */
    glyphs?: string;
    /** Source attribution shown in the map control (default: PROTOMAPS_ATTRIBUTION). */
    attribution?: string;
  };
  center: [number, number];
  zoom: number;
  /** Constrain panning/zooming to this [[minLng, minLat], [maxLng, maxLat]] box. */
  maxBounds?: [[number, number], [number, number]];
  /** External point markers with optional labels / popups. */
  markers?: MarkerSpec[];
  /**
   * Index of the marker whose popup opens right after first render
   * (default `undefined` — all popups closed). The MarkerSpec API is
   * unchanged; users pass markers as usual.
   */
  openMarkerIndex?: number;
  /** Track (line) annotations. */
  tracks?: TrackSpec[];
  /** Live HUD showing current center / zoom in the top-left corner. */
  showCenterHud?: boolean;
  navControl?: boolean;
  /** Extra class for the map container (controls its size). */
  className?: string;
  /** Called once the style has loaded (good for adding custom layers). */
  onMapReady?: (map: MapLibreMap) => void;
  // Event API: business code listens through props, not MapLibre.
  onClick?: (e: MapEventType["click"]) => void;
  onMove?: (e: MapEventType["move"]) => void;
  onZoom?: (e: MapEventType["zoom"]) => void;
  onIdle?: (e: MapEventType["idle"]) => void;
}

/**
 * Thin React wrapper around MapController + layer modules. The controller is
 * created once per basemap URL; only a URL change (new pmtiles vector source)
 * recreates the map via useMapInstance's resetKey. Flavor / glyphs / lang /
 * attribution changes re-apply the style in place (setStyle — camera,
 * markers, tracks and controls survive). Center/zoom changes move the camera,
 * and markers / tracks / event handlers are synced reactively.
 */
export function MapView({
  basemap,
  center,
  zoom,
  maxBounds,
  markers = [],
  tracks = [],
  openMarkerIndex,
  showCenterHud = false,
  navControl = true,
  className,
  onMapReady,
  onClick,
  onMove,
  onZoom,
  onIdle,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Only the basemap URL requires a fresh map (new vector source); flavor /
  // glyphs / lang / attribution changes are handled by the style effect below.
  const basemapKey = basemap.url;
  const controller = useMapInstance(
    containerRef,
    { basemap, center, zoom, maxBounds, navControl, showCenterHud },
    basemapKey,
  );
  const map = controller?.map ?? null;

  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;

  // Camera sync: move the camera when center/zoom props change (no remount).
  // Guarded by value comparison so re-renders with identical values are no-ops.
  useEffect(() => {
    if (!controller) return;
    const c = controller.getCenter();
    if (
      c.lng === center[0] &&
      c.lat === center[1] &&
      controller.getZoom() === zoom
    )
      return;
    controller.jumpTo({ center, zoom });
  }, [controller, center[0], center[1], zoom]);

  // Style sync: flavor / glyphs / lang / attribution changes re-apply the
  // style without recreating the map. The map was constructed with the
  // current basemap, so matching options are a no-op (skip on mount).
  useEffect(() => {
    if (!controller) return;
    const current = controller.basemap;
    const same =
      current.url === basemap.url &&
      current.flavor === basemap.flavor &&
      (current.glyphs ?? "") === (basemap.glyphs ?? "") &&
      (current.lang ?? "") === (basemap.lang ?? "") &&
      (current.attribution ?? "") === (basemap.attribution ?? "");
    if (same) return;
    controller.setStyle(basemap);
  }, [
    controller,
    basemap.url,
    basemap.flavor,
    basemap.glyphs,
    basemap.lang,
    basemap.attribution,
  ]);

  // onMapReady: fire once the style has loaded (controller handles the
  // already-loaded case so the callback is never missed).
  useEffect(() => {
    if (!controller) return;
    controller.onReady(() => onMapReadyRef.current?.(controller.map));
  }, [controller]);

  // HUD: show/hide reactively (the controller is created once per basemap;
  // toggling showCenterHud must not recreate the map).
  useEffect(() => {
    if (!controller) return;
    controller.setShowCenterHud(showCenterHud);
  }, [controller, showCenterHud]);

  // Nav control: show/hide reactively (no map recreation).
  useEffect(() => {
    if (!controller) return;
    controller.setNavControl(navControl);
  }, [controller, navControl]);

  // Max bounds: apply reactively (MapLibre clamps the camera to the new box).
  useEffect(() => {
    if (!controller) return;
    controller.setMaxBounds(maxBounds);
  }, [controller, maxBounds]);

  // Markers: rebuild on change (few points → maplibre Marker with DOM label).
  // Auto-open the popup only when the map or the requested index changes — a
  // re-sync of the same data must not reopen a popup the user already closed.
  const lastAutoOpenRef = useRef<{
    map: MapLibreMap | null;
    index: number | undefined;
  }>({
    map: null,
    index: undefined,
  });
  useEffect(() => {
    if (!map) return;
    const prev = lastAutoOpenRef.current;
    const shouldOpen =
      openMarkerIndex !== undefined &&
      (prev.map !== map || prev.index !== openMarkerIndex);
    lastAutoOpenRef.current = { map, index: openMarkerIndex };
    return syncMarkerLayer(
      map,
      markers.map(toMarkerFeature),
      shouldOpen ? openMarkerIndex : undefined,
    );
  }, [map, markers, openMarkerIndex]);

  // Tracks: GeoJSON source + line layer (waits for style load internally).
  useEffect(() => {
    if (!map) return;
    return syncTrackLayer(map, tracks.map(toTrackFeature));
  }, [map, tracks]);

  // Event API: forward prop handlers to the map.
  useEffect(() => {
    if (!map) return;
    if (onClick) map.on("click", onClick);
    if (onMove) map.on("move", onMove);
    if (onZoom) map.on("zoom", onZoom);
    if (onIdle) map.on("idle", onIdle);
    return () => {
      if (onClick) map.off("click", onClick);
      if (onMove) map.off("move", onMove);
      if (onZoom) map.off("zoom", onZoom);
      if (onIdle) map.off("idle", onIdle);
    };
  }, [map, onClick, onMove, onZoom, onIdle]);

  return (
    <div ref={containerRef} className={`relative w-full ${className ?? ""}`} />
  );
}
