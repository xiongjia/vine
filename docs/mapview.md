# MapView — Component Design

`MapView` is the reusable map component in `@vine/ui`, built on MapLibre GL v5 +
Protomaps pmtiles basemaps. It ships in two forms: a **React component** and an
**embeddable plain-HTML widget**.

## 1. Goals

- Well-encapsulated: business code never touches MapLibre directly.
- Two consumption modes: React props (`<MapView … />`) and an imperative widget
  (`createMapWidget(el, options)`).
- View by coordinates / bounding box, markers, tracks, multi-region basemap
  switching, multiple styles.
- Works offline with a local cache in dev, and against R2/S3 URLs in production.

## 2. Module Layout

```
packages/ui/src/
├── components/ui/
│   └── map-view.tsx            # React wrapper (public MapView)
├── widget.tsx                  # createMapWidget (plain-HTML entry)
└── lib/map/
    ├── map-controller.ts       # framework-agnostic MapController
    ├── specs.ts                # MarkerSpec / TrackSpec / MapFlavor (public API)
    ├── geojson.ts              # spec → GeoJSON feature conversion
    ├── basemap/protomaps.ts    # createProtomapsStyle (flavors + attribution)
    ├── layers/marker-layer.ts  # GeoJSON points → maplibre Markers (DOM)
    ├── layers/track-layer.ts   # GeoJSON lines → line layers
    └── hooks/use-map-instance.ts  # bind a controller to a React lifecycle
```

## 3. Architecture

```
MapView (React props)
  └── useMapInstance(container, options, resetKey)
        └── MapController          ← owns the MapLibre instance
              ├── createProtomapsStyle(basemap)   → style (vector source)
              ├── markers → toMarkerFeature → syncMarkerLayer
              ├── tracks  → toTrackFeature  → syncTrackLayer
              └── camera / events / HUD
```

- **`MapController`** — owns the MapLibre map: create/destroy, `flyTo`,
  `fitBounds`, `getCenter`/`getZoom`, event wiring (`on`/`off`), layer and
  source management (waits for style load), runtime HUD
  (`setShowCenterHud`).
- **`useMapInstance`** — creates the controller once per `resetKey`. The reset
  key is the basemap identity (`url|flavor|glyphs`), so **switching the basemap
  recreates the map** while plain `center`/`zoom` prop changes only move the
  camera.
- **Specs** — `MarkerSpec` (`lng`, `lat`, `label?`, `popupContent?`, `color?`,
  `emoji?`) and `TrackSpec` (`name`, `color`, `coordinates`, `closed?`) are the
  public data API; internally converted to GeoJSON so layers are
  framework-agnostic.
- **Layers** — `marker-layer` renders few points as DOM markers (emoji or
  colored dot + label + popup); `track-layer` renders lines/polygons as
  GeoJSON-source line layers with index-based ids and idempotent re-apply.
- **Basemap style** — `createProtomapsStyle` builds the style from
  `@protomaps/basemaps` `layers()` + `namedFlavor(flavor)` with a local glyphs
  URL and an overridable `attribution`.

## 4. React API

```tsx
import { MapView, shanghaiMarkers, shanghaiTracks } from "@vine/ui";

<MapView
  basemap={{ url: "pmtiles:///pmtiles/shanghai.pmtiles", flavor: "light", lang: "zh", glyphs?, attribution? }}
  center={[121.47, 31.23]}
  zoom={12}
  markers={shanghaiMarkers}   // MarkerSpec[]
  tracks={shanghaiTracks}     // TrackSpec[]
  openMarkerIndex={0}         // auto-open the first marker popup on first render
  maxBounds={[[minLng, minLat], [maxLng, maxLat]]}
  showCenterHud
  navControl
  className="h-[480px] w-full"  // the caller controls the container size
  onMapReady={(map) => {}}
  onClick / onMove / onZoom / onIdle
/>
```

Notes:

- The container is `relative w-full` + `className`; **height must come from the
  caller** (`className`, `absolute inset-0`, or a sized parent).
- `basemap.url` (or flavor/glyphs) change recreates the map; `center`/`zoom`
  changes fly the camera without a remount.
- `openMarkerIndex` opens one popup on first render without changing the
  MarkerSpec API.
- ⚠️ `popupContent` is injected via `Popup.setHTML` — **callers must sanitize**
  untrusted input (XSS).

## 5. Widget API (plain HTML)

```ts
const w = createMapWidget(el, {
  basemapUrl: "pmtiles:///pmtiles/shanghai.pmtiles", // host serves this (HTTP Range)
  glyphsUrl: "/glyphs/{fontstack}/{range}.pbf",
  center,
  zoom,
  markers,
  tracks,
  attribution,
  showCenterHud,
  navControl,
});

w.setData({ markers, tracks }); // replace data at runtime
w.setBasemap(url, { center, zoom }); // switch region file (map recreated)
w.flyTo({ center, zoom }); // camera (queued until ready)
w.destroy(); // unmount + release the map
```

The widget is built with react / maplibre / pmtiles **externalized**: the
bundle keeps bare imports that the host page resolves through an import map
(react, react-dom, maplibre-gl, pmtiles, @protomaps/basemaps), so the heavy
libraries can be served from any CDN (jsdelivr `+esm` pinned versions by
default — required for react / react-dom, which ship CJS only):

```bash
pnpm exec turbo run build:widget --filter=@vine/ui
# → packages/ui/dist/widget/map-widget-<hash>.js|css, import-map-<hash>.json, widget.json
```

Files are content-hashed (`map-widget-ba8b6886988e.js`), so the filename
changes whenever the bundle changes and a stale cached copy is never served.
`widget.json` is the manifest consumers actually read: entry/css names,
per-file hashes, pinned dependency versions and the ready-to-paste import map.
The host page includes `<script type="importmap">…</script>` (any entry can be
overridden with a different CDN) before importing the hashed entry module.

## 6. Version & Compatibility Notes

- **MapLibre v5 is pinned** (`^5.24.0`): v6 breaks the `pmtiles` protocol
  (no tile requests after the TileJSON call). Upgrade only together with a
  `pmtiles` release that explicitly supports it; verify with
  `compat-check.html` if reintroduced.
- **Glyphs** — served from the local cache (`/glyphs/...`) by the Vite
  `glyph-proxy` plugin, or from R2/upstream in production. The `protomaps`
  glyph source has **no CJK glyphs**; use the `maplibre` source
  (`demotiles.maplibre.org`) for Chinese/Japanese labels.
- **pmtiles URLs** — `pmtiles:///relative/path` for same-origin files,
  `pmtiles://https://…` for remote object storage.
