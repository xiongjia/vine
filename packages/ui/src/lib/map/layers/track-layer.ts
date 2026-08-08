import type { Map as MapLibreMap } from "maplibre-gl";
import type { Feature, LineString, Polygon } from "geojson";

export interface TrackFeatureProps {
  name: string;
  color: string;
}

export type TrackFeature = Feature<LineString | Polygon, TrackFeatureProps>;

/**
 * Render line/polygon features as GeoJSON-source line layers. Waits for the
 * style to load before adding sources/layers, and re-applies after every
 * `style.load` — so tracks survive a Map.setStyle() (flavor / glyphs / label
 * changes) that replaces the style's sources and layers.
 *
 * Layer/source ids are index-based (`track-<i>`). The apply step removes any
 * stale ids first (this instance's previous adds + anything already under the
 * target ids), and the cleanup removes this instance's layers — so re-applying
 * after a tracks change never duplicates a source, and unmount cleans up (the
 * try/catch tolerates the map having been destroyed already).
 */
export function syncTrackLayer(
  map: MapLibreMap,
  features: TrackFeature[],
): () => void {
  let disposed = false;
  const addedIds: string[] = [];

  const apply = () => {
    const idsToAdd = features.map((_, i) => `track-${i}`);
    for (const id of new Set([...addedIds, ...idsToAdd])) {
      try {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      } catch {
        // map already removed — nothing to clean
      }
    }
    addedIds.length = 0;

    features.forEach((feature, i) => {
      const id = `track-${i}`;
      addedIds.push(id);
      map.addSource(id, { type: "geojson", data: feature });
      map.addLayer({
        id,
        type: "line",
        source: id,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": feature.properties?.color, "line-width": 3 },
      });
    });
  };

  const onStyleLoad = () => {
    if (!disposed) apply();
  };

  // "style.load" fires on the initial style load and after every setStyle();
  // keep listening so re-applies stay idempotent across style reloads.
  map.on("style.load", onStyleLoad);
  if (map.isStyleLoaded()) {
    apply();
  }
  return () => {
    disposed = true;
    map.off("style.load", onStyleLoad);
    for (const id of addedIds) {
      try {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      } catch {
        // map already removed
      }
    }
  };
}
