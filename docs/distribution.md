# Distribution

Vine publishes maps two ways: **static files handed to a host** (the widget) or
**map assets uploaded to S3-compatible object storage** (Cloudflare R2, AWS S3,
any S3-compatible provider). There is no npm publishing.

> External references: [PMTiles cloud storage](https://docs.protomaps.com/pmtiles/cloud-storage).

## 1. What gets published

| Asset         | Source                                                               | Remote prefix   |
| ------------- | -------------------------------------------------------------------- | --------------- |
| Widget bundle | `packages/ui/dist/widget/map-widget.{js,css}`                        | `vine/widget/`  |
| Region tiles  | `.maps-cache/pmtiles/*.pmtiles` + `*.metadata.json` + `pmtiles.json` | `vine/pmtiles/` |
| Glyph fonts   | `.maps-cache/glyphs/**`                                              | `vine/glyphs/`  |

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

### Uploaded layout

After a sync (or per-region uploads), the bucket looks like this — `vine/` is
the default storage root, configurable via `--root <dir>` or
`VINE_STORAGE_ROOT` (see below):

```
v/ (bucket root)
└── vine/                          # storage root (default; override with --root / VINE_STORAGE_ROOT)
    ├── widget/                    # widget bundle (map-widget.js + map-widget.css)
    ├── pmtiles/
    │   ├── pmtiles.json           # catalog: every region + its .pmtiles file (discovery entry point)
    │   ├── shanghai.pmtiles
    │   ├── shanghai.metadata.json # per-region sidecar (lng/lat bounds, zoom, build date)
    │   ├── tokyo.pmtiles
    │   └── tokyo.metadata.json
    └── glyphs/
        └── Noto Sans Regular/     # one {range}.pbf per 256-codepoint block
            ├── 12288-12543.pbf
            └── …
```

The storage root is configurable — pass `--root <dir>` to `sync-assets` /
`upload` / `rm`, or set `VINE_STORAGE_ROOT` in the environment:

```bash
pnpm --filter=@vine/maps-cli cli sync-assets --storage r2 --root maps
VINE_STORAGE_ROOT=prod pnpm --filter=@vine/maps-cli cli sync-assets --storage r2
```

`--prefix` still exists as a full path override (wins over `--root`):
`sync-assets --prefix data` / `upload shanghai --prefix data/pmtiles` reproduce
the pre-`vine` layout.

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

# optional: storage root directory (default: vine)
VINE_STORAGE_ROOT=vine
```

## 3. Bucket configuration (manual, per official docs)

### Public read

Consumers must be able to GET the objects without credentials. This works
differently on R2 vs S3.

**R2** — public access is granted per bucket, two options:

1. **r2.dev subdomain** (test only): Dashboard → R2 → _bucket_ → Settings →
   enable _R2.dev subdomain_. Public by default; URL
   `https://pub-<hash>.r2.dev/<bucket>/<key>`. Rate-limited (~100 req/s) and
   not intended for production traffic.
2. **Custom domain** (production, recommended): _bucket_ → Settings → _Custom
   Domains_, connect a domain. The domain maps directly to that bucket, so the
   URL is `https://<domain>/<key>` (no bucket name in the path).

No bucket policy or ACL is needed on R2. Note that the CLI's
`VINE_R2_ENDPOINT` (`*.r2.cloudflarestorage.com`) is the **S3-compatible
upload API only** — it is not publicly readable. Consumers must use the r2.dev
URL or the custom domain.

**S3** — bucket policy allowing `GetObject`, with _Block Public Access_ turned
off (or `--acl public-read` at upload; the CLI does not set ACLs):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::vine-maps/*"
    }
  ]
}
```

(S3: `aws s3api put-bucket-policy --bucket vine-maps --policy file://policy.json`)

### CORS

Allow the widget/MapLibre to fetch the JS, tiles and fonts from another origin:

```json
{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedHeaders": ["Range"],
  "ExposeHeaders": ["Content-Range", "Accept-Ranges"]
}
```

- R2: Dashboard → bucket → Settings → CORS.
- S3: `aws s3api put-bucket-cors --bucket vine-maps --cors-configuration file://cors.json`.

### HTTP Range

Object storage natively supports byte-range requests, which pmtiles needs.
**Presigned URLs do not work** (every Range request needs its own signature).

### Caching pmtiles

`*.pmtiles` are overwritten in place on re-upload, so configure caching so
clients revalidate instead of serving stale ranges: on R2 add a **Cache Rule**
for the custom domain (e.g. no-cache / revalidate for `*/*.pmtiles`); on S3 set
appropriate `Cache-Control` headers on the objects. Alternatively, version the
filename (e.g. `shanghai-20260815.pmtiles`) as recommended by Protomaps.

## 4. Using the published URLs

The demo reads tile/glyph URLs at **build time** (injected as CI build params):

```yaml
env:
  VITE_PMTILES_URL_PREFIX: pmtiles://https://<bucket-domain>/vine/pmtiles/
  VITE_GLYPHS_URL: https://<bucket-domain>/vine/glyphs/{fontstack}/{range}.pbf
```

Any consumer can build region URLs directly:

```
pmtiles://https://<bucket-domain>/vine/pmtiles/shanghai.pmtiles
```

For discovery, fetch the aggregate catalog — one request lists every region,
its metadata and its `.pmtiles` file name (see [docs/pmtiles.md](./pmtiles.md)
§3):

```
https://<bucket-domain>/vine/pmtiles/pmtiles.json
```

(Adjust `vine/` in the URLs above if you changed the storage root via `--root`
or `VINE_STORAGE_ROOT`.)

What `<bucket-domain>` is, per provider:

- **R2 r2.dev**: `https://pub-<hash>.r2.dev/<bucket>` — the bucket name stays in
  the path, so a full tile URL is
  `pmtiles://https://pub-<hash>.r2.dev/<bucket>/vine/pmtiles/shanghai.pmtiles`.
- **R2 custom domain**: `https://<domain>` — the domain maps straight to the
  bucket, no bucket segment.
- **S3**: `https://<bucket>.s3.<region>.amazonaws.com`.

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
