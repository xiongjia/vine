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

## 3. Region presets & metadata

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

Note: sidecars written by `extract`/`metadata` keep the _requested_ crop bbox,
while `update-metadata` writes the _actual_ header bbox — the two can differ by
a fraction of a degree (pmtiles snaps bounds to tile boundaries).

### Aggregate index: `pmtiles.json`

The per-region sidecar alone is not enough for discovery — a consumer would
have to know every filename in advance. So every mutation also maintains one
aggregate catalog file, `pmtiles.json`, next to the sidecars (local:
`.maps-cache/pmtiles/pmtiles.json`, remote: `vine/pmtiles/pmtiles.json` —
the `vine` root is configurable via `--root` / `VINE_STORAGE_ROOT`). It
reuses the same entry shape (the `file` field is the metadata ↔ `.pmtiles`
relationship), so a consumer fetches one JSON to see every region and where its
tiles live:

```json
{
  "version": 1,
  "updatedAt": "2026-01-15T10:30:00.000Z",
  "regions": [
    {
      "name": "shanghai",
      "file": "shanghai.pmtiles",
      "bbox": [120.8, 30.6, 122.2, 31.8],
      "center": [121.5, 31.2],
      "minZoom": 0,
      "maxZoom": 15,
      "buildDate": "20260807",
      "sizeBytes": 56425096
    }
  ]
}
```

How the index stays in sync:

| Command                                  | Effect on `pmtiles.json`                                                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `extract <region>` / `metadata <region>` | upserts the region's entry                                                                                                       |
| `update-metadata [dir]`                  | rebuilds it from the sidecars in a directory                                                                                     |
| `upload <region>`                        | upserts, then uploads `pmtiles.json` with the region files                                                                       |
| `rm <region>`                            | fetches the remote index, removes the region's entry and re-uploads it (falls back to the local index when no remote one exists) |
| `sync-assets`                            | uploads the index as-is with the rest of `vine/pmtiles/`                                                                         |

Deleting a region is a multi-object operation (tiles, then index) — if the
final index upload fails, the catalog briefly points at deleted files; re-run
`rm <region>` to finish the unpublish.

`rm` also mirrors the published catalog back to the local index. The local
`.pmtiles`/sidecar files are kept for dev — so note that running
`update-metadata` (or `extract`/`metadata`/`upload` of another region)
afterwards rebuilds the local index from the sidecars and will **re-add** the
removed region. Delete its local files (or re-run `rm`) if you want it to stay
unpublished.

The individual `<region>.metadata.json` sidecars stay in place (backward
compatible) — `pmtiles.json` is derived, never a replacement.

## 4. Local cache (`.maps-cache/`)

Extracted files go to `.maps-cache/pmtiles/` at the repo root (gitignored,
machine-local). The dev Vite servers mount them via the `local-tiles` plugin at
`/pmtiles/*` with full HTTP Range/206 support — MapLibre reads tiles with
byte-range requests against the same origin.

```bash
pnpm --filter=@vine/maps-cli cli list      # regions + sidecar summary
pnpm --filter=@vine/maps-cli cli verify tokyo   # pmtiles show + sidecar cross-check
pnpm --filter=@vine/maps-cli cli metadata shanghai --build 20260807  # (re)write sidecar
pnpm --filter=@vine/maps-cli cli update-metadata [dir]  # (re)write sidecars for every .pmtiles in a dir + rebuild pmtiles.json (default: repo root; relative dirs resolve against the repo root)
pnpm --filter=@vine/maps-cli cli update-metadata [dir] --dry-run  # preview only, writes nothing
```

`update-metadata` derives bbox/center/zoom from each file's own header (no
preset needed), so it works for **any** pmtiles files dropped into a directory.
Relative `[dir]` paths resolve against the repo root (the CLI runs under
`pnpm --filter`, whose cwd is the package dir), so
`update-metadata .maps-cache/pmtiles` works from anywhere.
`buildDate` is preserved from an existing sidecar (defaults to `local` for new
files); corrupt sidecars are regenerated from the header. `--dry-run` prints
the per-file plan and the resulting catalog size without writing anything.

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

| Symptom                  | Cause / fix                                                                   |
| ------------------------ | ----------------------------------------------------------------------------- |
| Extract fails mid-stream | Network flakiness on large downloads; retry, or lower `--maxzoom`             |
| Blank map (gray)         | `pmtiles://` protocol not registered (it is auto-registered by MapController) |
| Tiles 404                | Dev server not mounting `.maps-cache` (local-tiles plugin missing)            |
| Chinese labels blank     | Glyph cache warmed from the `protomaps` source (no CJK); re-warm `maplibre`   |
| MapLibre v6 blank        | v6 is incompatible with pmtiles — stay on the pinned v5                       |

## 7. Extending regions

Add a preset in `presets.ts` (name + bbox + default max zoom), then
`extract <name>`; a fresh `metadata` write registers it for `list`/`verify` and
upserts it into `pmtiles.json`. For arbitrary pmtiles files (no preset), drop
them in a directory and run `update-metadata` to generate sidecars + the
catalog in one pass. For an irregular area use `--bbox` or crop with the Go CLI
directly (`pmtiles extract <url> out.pmtiles --region=area.geojson`).
