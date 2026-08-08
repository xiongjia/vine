# Distribution

Vine publishes maps two ways: **static files handed to a host** (the widget) or
**map assets uploaded to S3-compatible object storage** (Cloudflare R2, AWS S3,
any S3-compatible provider). There is no npm publishing.

> External references: [PMTiles cloud storage](https://docs.protomaps.com/pmtiles/cloud-storage).

## 1. What gets published

| Asset | Source | Remote prefix |
| ----- | ------ | ------------- |
| Widget bundle | `packages/ui/dist/widget/map-widget.{js,css}` | `data/widget/` |
| Region tiles | `.maps-cache/pmtiles/*.pmtiles` + `*.metadata.json` | `data/pmtiles/` |
| Glyph fonts | `.maps-cache/glyphs/**` | `data/glyphs/` |

The full set is synced in one pass:

```bash
pnpm exec turbo run build:widget --filter=@vine/ui   # fresh widget bundle
pnpm --filter=@vine/maps-cli cli sync-assets --storage r2 --dry-run  # preview
pnpm --filter=@vine/maps-cli cli sync-assets --storage r2
```

`--storage` accepts `r2` or `s3`; per-region operations (upload / delete):

```bash
pnpm --filter=@vine/maps-cli cli upload shanghai --storage s3
pnpm --filter=@vine/maps-cli cli rm tokyo --storage r2
```

## 2. Credentials

Loaded from `.env` / `.env.local` at the repo root (gitignored) or from CI
secrets. Each storage kind has its own prefix:

```bash
# Cloudflare R2 (S3-compatible endpoint)
VINE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
VINE_R2_ACCESS_KEY=...
VINE_R2_SECRET_KEY=...
VINE_R2_BUCKET=vine-maps
VINE_R2_REGION=auto

# AWS S3
VINE_S3_REGION=ap-northeast-1
VINE_S3_ACCESS_KEY=...
VINE_S3_SECRET_KEY=...
VINE_S3_BUCKET=vine-maps
```

## 3. Bucket configuration (manual, per official docs)

1. **Public read** — bucket policy allowing `GetObject` (S3: bucket policy or
   `--acl public-read`).
2. **CORS** — allow the widget/MapLibre to fetch the JS, tiles and fonts from
   another origin:

   ```json
   {
     "AllowedOrigins": ["*"],
     "AllowedMethods": ["GET", "HEAD"],
     "AllowedHeaders": ["Range"],
     "ExposeHeaders": ["Content-Range", "Accept-Ranges"]
   }
   ```

   (R2: Dashboard → Bucket → Settings → CORS; S3: `aws s3api put-bucket-cors`.)
3. **HTTP Range** — object storage natively supports byte-range requests, which
   pmtiles needs. **Presigned URLs do not work** (every Range request needs its
   own signature).

## 4. Using the published URLs

The demo reads tile/glyph URLs at **build time** (injected as CI build params):

```yaml
env:
  VITE_PMTILES_URL_PREFIX: pmtiles://https://<bucket-domain>/data/pmtiles/
  VITE_GLYPHS_URL: https://<bucket-domain>/data/glyphs/{fontstack}/{range}.pbf
```

Any consumer can build region URLs directly:

```
pmtiles://https://<bucket-domain>/data/pmtiles/shanghai.pmtiles
```

## 5. Static-file distribution (no object storage)

Hand the widget bundle to a host that serves the pmtiles (Range) and glyphs:

```html
<link rel="stylesheet" href="map-widget.css" />
<script type="module">
  import { createMapWidget } from "./map-widget.js";
  const w = createMapWidget(el, {
    basemapUrl: "pmtiles:///pmtiles/shanghai.pmtiles", // host serves this
    glyphsUrl: "/glyphs/{fontstack}/{range}.pbf",
    center: [121.47, 31.23],
    zoom: 12,
  });
</script>
```

Version the bundle for upgrades, e.g. `map-widget@1.2.0.js`.

## 6. Restoring GitHub Pages (after the refactor)

Once the demo serves its tiles from object storage (build-time URLs above):

1. In `.github/workflows/ci.yml`, upload `apps/demo/dist` with
   `actions/upload-pages-artifact@v5`.
2. Re-enable a `deploy` job (`actions/deploy-pages@v5`, `pages: write`,
   `id-token: write`) gated on `refs/heads/main`.
