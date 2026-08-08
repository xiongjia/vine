# PMTiles Management

Region basemaps are single-file vector tile archives (`.pmtiles`) read via HTTP
Range requests. Vine manages them with the `maps-cli` tool and serves them from
a local cache in dev and from R2/S3 in production.

> External references: [PMTiles format](https://docs.protomaps.com/pmtiles/),
> [Cloud Storage](https://docs.protomaps.com/pmtiles/cloud-storage),
> [MapLibre integration](https://docs.protomaps.com/pmtiles/maplibre),
> [go-pmtiles](https://github.com/protomaps/go-pmtiles).

## 1. Prerequisite: the pmtiles binary

`maps-cli` shells out to the official Go CLI (installed by the developer):

```bash
brew install pmtiles                                        # binary: pmtiles
go install github.com/protomaps/go-pmtiles@latest           # binary: go-pmtiles
```

The CLI auto-detects either name; override with `VINE_PMTILES_BIN`.

## 2. How a region file is produced

`maps-cli extract` remote-crops the latest Protomaps global build
(`https://build.protomaps.com/YYYYMMDD.pmtiles`) by bounding box — no 128 GB
full download (Range requests only). The build date is resolved from
`https://build-metadata.protomaps.dev/builds.json`.

```bash
pnpm --filter=@vine/maps-cli cli build-date                 # latest YYYYMMDD
pnpm --filter=@vine/maps-cli cli extract shanghai           # preset region
pnpm --filter=@vine/maps-cli cli extract tokyo --bbox=139.4,35.4,140.2,35.9 --maxzoom 15
pnpm --filter=@vine/maps-cli cli extract shanghai --dry-run # print the command only
```

## 3. Region presets & the metadata sidecar

Presets live in `apps/maps-cli/src/presets.ts` and bind a region name to its
lng/lat bounding box (first two test regions: **shanghai**, **tokyo**).

Every extract/metadata run writes a `<region>.metadata.json` sidecar next to the
pmtiles file, so consumers know the lng/lat bounds without parsing the binary:

```json
{
  "name": "shanghai",
  "bbox": [120.8, 30.6, 122.2, 31.9],
  "center": [121.5, 31.2],
  "minZoom": 0,
  "maxZoom": 15,
  "buildDate": "20260807",
  "sizeBytes": 21000000,
  "file": "shanghai.pmtiles"
}
```

## 4. Local cache (`.maps-cache/`)

Extracted files go to `.maps-cache/pmtiles/` at the repo root (gitignored,
machine-local). The dev Vite servers mount them via the `local-tiles` plugin at
`/pmtiles/*` with full HTTP Range/206 support — MapLibre reads tiles with
byte-range requests against the same origin.

```bash
pnpm --filter=@vine/maps-cli cli list      # regions + sidecar summary
pnpm --filter=@vine/maps-cli cli verify tokyo   # pmtiles show + sidecar cross-check
pnpm --filter=@vine/maps-cli cli metadata shanghai --build 20260807  # (re)write sidecar
```

Glyphs (`label fonts`) live in `.maps-cache/glyphs/` and are served by the
`glyph-proxy` plugin; a warm-up pass downloads every needed 256-codepoint range
so the map runs fully offline (see [docs/mapview.md](./mapview.md) §6 for the
CJK caveat).

## 5. Coordinate conversion

Amap/Baidu pickers return GCJ-02 (Mars coordinates); convert to WGS-84 before
using coordinates with OSM/MapLibre:

```bash
pnpm --filter=@vine/maps-cli cli gcj2wgs 121.48 31.16
# 121.475504, 31.161994
```

## 6. Common issues

| Symptom                  | Cause / fix                                                                  |
| ------------------------ | ---------------------------------------------------------------------------- |
| Extract fails mid-stream | Local proxy flakiness on large downloads; retry, or lower `--maxzoom`        |
| Blank map (gray)         | `pmtiles://` protocol not registered (it is auto-registered by MapController) |
| Tiles 404                | Dev server not mounting `.maps-cache` (local-tiles plugin missing)           |
| Chinese labels blank     | Glyph cache warmed from the `protomaps` source (no CJK); re-warm `maplibre`  |
| MapLibre v6 blank        | v6 is incompatible with pmtiles — stay on the pinned v5                      |
| Network download issues  | `HTTPS_PROXY=http://127.0.0.1:1095`                                          |

## 7. Extending regions

Add a preset in `presets.ts` (name + bbox + default max zoom), then
`extract <name>`; a fresh `metadata` write registers it for `list`/`verify`.
For an irregular area use `--bbox` or crop with the Go CLI directly
(`pmtiles extract <url> out.pmtiles --region=area.geojson`).
