import type { LineString, Point, Polygon } from "geojson";
import type { MarkerSpec, TrackSpec } from "./specs";
import type { MarkerFeature, MarkerFeatureProps } from "./layers/marker-layer";
import type { TrackFeature, TrackFeatureProps } from "./layers/track-layer";

/** Convert a MarkerSpec to a GeoJSON Point feature. */
export function toMarkerFeature(spec: MarkerSpec): MarkerFeature {
  const properties: MarkerFeatureProps = {
    label: spec.label,
    popupContent: spec.popupContent,
    popupText: spec.popupText,
    color: spec.color,
    emoji: spec.emoji,
  };
  const geometry: Point = { type: "Point", coordinates: [spec.lng, spec.lat] };
  return { type: "Feature", properties, geometry };
}

/** Convert a TrackSpec to a GeoJSON LineString/Polygon feature. */
export function toTrackFeature(spec: TrackSpec): TrackFeature {
  const properties: TrackFeatureProps = { name: spec.name, color: spec.color };
  const geometry: LineString | Polygon = spec.closed
    ? { type: "Polygon", coordinates: [spec.coordinates] }
    : { type: "LineString", coordinates: spec.coordinates };
  return { type: "Feature", properties, geometry };
}
