export { MapController } from "./map-controller";
export type { CameraTarget, MapControllerOptions } from "./map-controller";

export type { MarkerSpec, TrackSpec } from "./specs";
export { createProtomapsStyle, PROTOMAPS_ATTRIBUTION } from "./basemap/protomaps";
export type { MapFlavor, ProtomapsBasemapOptions } from "./basemap/protomaps";

export { syncMarkerLayer } from "./layers/marker-layer";
export type { MarkerFeature, MarkerFeatureProps } from "./layers/marker-layer";

export { syncTrackLayer } from "./layers/track-layer";
export type { TrackFeature, TrackFeatureProps } from "./layers/track-layer";

export { useMapInstance } from "./hooks/use-map-instance";
