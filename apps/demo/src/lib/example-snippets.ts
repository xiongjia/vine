import {
  shanghaiMarkers,
  shanghaiTracks,
  tokyoMarkers,
  tokyoTracks,
} from "@vine/ui";
import type { MarkerSpec, TrackSpec } from "@vine/ui";

/** Example snippet builder: generated from the live data (single source of truth, shows the markers/tracks arrays). */

const markerLines = (markers: MarkerSpec[]): string =>
  markers
    .map(
      (m) =>
        `  { lng: ${m.lng}, lat: ${m.lat}, label: "${m.label}", emoji: "${m.emoji}", color: "${m.color}" }`,
    )
    .join(",\n");

const trackLines = (tracks: TrackSpec[]): string =>
  tracks
    .map(
      (t) =>
        `  {\n    name: "${t.name}",\n    color: "${t.color}",\n    coordinates: ${JSON.stringify(t.coordinates)}\n  }`,
    )
    .join(",\n");

function exampleSnippet(opts: {
  region: string;
  center: string;
  markers: MarkerSpec[];
  tracks?: TrackSpec[];
  extra?: string;
}): string {
  const tracks = opts.tracks
    ? `\n// data: tracks (TrackSpec[])\nconst tracks: TrackSpec[] = [\n${trackLines(opts.tracks)}\n];\n`
    : "";
  return `// data: markers (MarkerSpec[])\nconst markers: MarkerSpec[] = [\n${markerLines(opts.markers)}\n];${tracks}
<MapView
  className="h-[420px] w-full rounded-xl"
  basemap={{ url: "pmtiles:///pmtiles/${opts.region}.pmtiles" }}
  center={${opts.center}}
  zoom={12}
  markers={markers}${opts.tracks ? "\n  tracks={tracks}" : ""}${opts.extra ? `\n  ${opts.extra}` : ""}
/>`;
}

/** The code snippet strings used by the example components. */
export const shanghaiCode = exampleSnippet({
  region: "shanghai",
  center: "[121.47, 31.23]",
  markers: shanghaiMarkers,
  tracks: shanghaiTracks,
  extra: "openMarkerIndex={0}\n  showCenterHud",
});

export const tokyoCode = exampleSnippet({
  region: "tokyo",
  center: "[139.7, 35.68]",
  markers: tokyoMarkers,
  tracks: tokyoTracks,
  extra: "openMarkerIndex={0}",
});

export const styleCode = exampleSnippet({
  region: "shanghai",
  center: "[121.47, 31.23]",
  markers: shanghaiMarkers,
  extra: "flavor // light / dark / grayscale / black",
});
