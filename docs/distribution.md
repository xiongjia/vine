# Distribution

Vine publishes maps two ways: **static files handed to a host** (the widget) or
**map assets uploaded to S3-compatible object storage** (Cloudflare R2, AWS S3,
any S3-compatible provider). There is no npm publishing.

> External references: [PMTiles cloud storage](https://docs.protomaps.com/pmtiles/cloud-storage).

## 1. What gets published

| Asset         | Source                                                               | Remote prefix   |
| ------------- | -------------------------------------------------------------------- | --------------- |
| Widget bundle | `packages/ui/dist/widget/map-widget-<hash>.{js,css}` + `widget.json` | `vine/widget/`  |
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

### Upload a single asset kind

`sync-assets` syncs **all three** kinds by default. Pass `--only <kind>` to
upload just one — repeatable or comma-separated, so a developer can re-publish
one thing without touching the others:

```bash
pnpm --filter=@vine/maps-cli cli sync-assets --only widget     # widget bundle only
pnpm --filter=@vine/maps-cli cli sync-assets --only pmtiles    # region tiles + catalog only
pnpm --filter=@vine/maps-cli cli sync-assets --only glyphs     # fonts only
pnpm --filter=@vine/maps-cli cli sync-assets --only pmtiles --only glyphs  # repeatable
pnpm --filter=@vine/maps-cli cli sync-assets --only pmtiles,glyphs         # …or comma-separated
pnpm --filter=@vine/maps-cli cli sync-assets                   # all three (default)
```

`sync-assets --only pmtiles` uploads the whole `pmtiles/` subtree; to push a
single region's tiles instead, `upload <region>` is the pmtiles-only,
per-region command.

> **`sync-assets` never builds — it uploads whatever is already in place**
> locally. The widget bundle is copied from `packages/ui/dist/widget/`, so run
> `build:widget` first to push a fresh bundle:
>
> ```bash
> pnpm exec turbo run build:widget --filter=@vine/ui                  # fresh bundle
> pnpm --filter=@vine/maps-cli cli sync-assets --only widget --storage r2
> ```
>
> Tiles and glyphs need no build step — they are synced straight from
> `.maps-cache/` (run `extract`/`update-metadata` / the glyph warm-up first if
> the cache is missing; `sync-assets` skips whatever directory does not exist
> and tells you what to run).

### Uploaded layout

After a sync (or per-region uploads), the bucket looks like this — `vine/` is
the default storage root, configurable via `--root <dir>` or
`VINE_STORAGE_ROOT` (see below):

```
v/ (bucket root)
└── vine/                          # storage root (default; override with --root / VINE_STORAGE_ROOT)
    ├── widget/                    # widget bundle (hashed js/css + widget.json manifest)
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

Widget files are content-hashed, so each release uploads **new** filenames and
old versions accumulate in `vine/widget/` (harmless — `widget.json` always
points at the current set — but they add up across releases). Prune them with
an R2 cache/lifecycle rule on `vine/widget/` or by deleting the stale keys
manually; a maps-cli `--prune` (delete remote widget objects not listed in the
local `widget.json`) is a planned follow-up.

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
secrets. Each storage kind has its own prefix. Start from the committed
template — `cp .env.example .env` and fill in real values; never put real
credentials into `.env.example` itself (it is committed):

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

### Proxy

Uploads (`upload`, `rm`, `sync-assets`) honor the standard `HTTPS_PROXY` /
`https_proxy` environment variable, read at process start like Node's own
proxy conventions:

```bash
HTTPS_PROXY=http://127.0.0.1:1095 pnpm --filter=@vine/maps-cli cli upload shanghai --storage r2
```

Implementation note: the AWS SDK creates its own keep-alive agents, which
bypass Node 24's `NODE_USE_ENV_PROXY=1` / `--use-env-proxy` auto-proxy — so
maps-cli injects the proxy agent into the S3 client explicitly
(`apps/maps-cli/src/lib/storage.ts`, `proxyAgent()`). `NO_PROXY` is not
honored — once a proxy is configured, every upload request goes through it.

Other network commands are unaffected:

- `build-date` uses `fetch`, where `NODE_USE_ENV_PROXY=1 HTTPS_PROXY=…` works.
- `extract` shells out to the Go `pmtiles` binary, which honors `HTTPS_PROXY` /
  `HTTP_PROXY` natively.

## 3. Bucket configuration (manual, per official docs)

### Public read

Consumers must be able to GET the objects without credentials. This works
differently on R2 vs S3.

**R2** — public access is granted per bucket, two options:

1. **r2.dev subdomain** (test only): Dashboard → R2 → _bucket_ → Settings →
   enable _R2.dev subdomain_. Public by default; URL
   `https://pub-<hash>.r2.dev/<key>` (no bucket name in the path —
   the dashboard shows the exact _Public Bucket URL_). Rate-limited
   (~100 req/s) and not intended for production traffic.
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

Allow the widget/MapLibre to fetch the JS, tiles and fonts from another
origin. Unrestricted (`*`) is the simplest; for production you can restrict to
specific origins (exact-match only — see the rules below). **The JSON format
differs between R2 and S3** (see the Cloudflare
[CORS docs](https://developers.cloudflare.com/r2/buckets/cors/) for the R2
shape).

**R2** — Dashboard → bucket → Settings → CORS → _Add CORS policy_ → JSON tab.
R2 expects an **array of rules, one origin per rule** — a single rule carrying
several origins is rejected as an invalid policy:

Unrestricted (single rule, `*`):

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Content-Range", "Accept-Ranges"]
  }
]
```

Restricted — **add one rule per origin**:

```json
[
  {
    "AllowedOrigins": ["https://maps.your-site.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Content-Range", "Accept-Ranges"]
  },
  {
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Content-Range", "Accept-Ranges"]
  }
]
```

**S3** — flat config object; **multiple origins in one rule are allowed**:
`aws s3api put-bucket-cors --bucket vine-maps --cors-configuration file://cors.json`

```json
{
  "AllowedOrigins": ["https://maps.your-site.com", "http://localhost:5173"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedHeaders": ["Range"],
  "ExposeHeaders": ["Content-Range", "Accept-Ranges"]
}
```

(Unrestricted on S3: set `"AllowedOrigins": ["*"]`.)

Origin matching rules (both providers):

- Origins must be **exact**: `scheme + host + port`, no trailing slash.
  `https://maps.your-site.com/` fails; `https://` vs `http://` and `www.` vs
  non-`www.` are different origins.
- **No partial wildcards** — only `*` or exact origins are accepted;
  `https://*.your-site.com` does not work. For a wildcard subdomain you would
  have to list each subdomain explicitly (one rule per origin on R2).
- The dev server (Vite default `http://localhost:5173`) is a separate origin —
  keep it in the list while developing, or the browser blocks tile/glyph
  requests from the local demo.
- CORS is a browser-side gate only; it does not make objects private. Any
  non-browser client (curl, pmtiles CLI, backend) can still GET public objects
  regardless of the allowed origins.

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

- **R2 r2.dev**: `https://pub-<hash>.r2.dev/<key>` — the bucket name is **not**
  in the path (a full tile URL is
  `pmtiles://https://pub-<hash>.r2.dev/vine/pmtiles/shanghai.pmtiles`; the
  dashboard's _Public Bucket URL_ gives the exact base).
- **R2 custom domain**: `https://<domain>` — the domain maps straight to the
  bucket, no bucket segment.
- **S3**: `https://<bucket>.s3.<region>.amazonaws.com`.

## 5. Static-file distribution (no object storage)

Hand the `widget.json` manifest to a host that serves the pmtiles (Range),
glyphs and the hashed files. The widget's react / maplibre / pmtiles deps are
externalized, so the page must resolve them with an import map — take the
ready-to-paste one from `widget.json` and override any entry to use a
different CDN. The manifest lists each dependency with its pinned version and
CDN URL:

```json
{
  "version": "0.0.0",
  "entry": "map-widget-ba8b6886988e.js",
  "css": "map-widget-6d4cf0bf511b.css",
  "files": [
    {
      "name": "map-widget-ba8b6886988e.js",
      "hash": "ba8b6886988e675a87a1c31c965f27b45a94e3f66f559c5dc16eda42669867ad",
      "size": 7884
    }
  ],
  "dependencies": {
    "react": {
      "version": "19.2.7",
      "cdn": "https://cdn.jsdelivr.net/npm/react@19.2.7/+esm"
    }
  },
  "importMap": {
    "react": "https://cdn.jsdelivr.net/npm/react@19.2.7/+esm"
  }
}
```

A minimal host page:

```html
<link rel="stylesheet" href="map-widget-<hash>.css" />
<script type="importmap">
  {
    "imports": {
      "react": "https://cdn.jsdelivr.net/npm/react@19.2.7/+esm",
      "react/jsx-runtime": "https://cdn.jsdelivr.net/npm/react@19.2.7/jsx-runtime/+esm",
      "react-dom/client": "https://cdn.jsdelivr.net/npm/react-dom@19.2.7/client/+esm",
      "maplibre-gl": "https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/+esm",
      "pmtiles": "https://cdn.jsdelivr.net/npm/pmtiles@4.4.1/+esm",
      "@protomaps/basemaps": "https://cdn.jsdelivr.net/npm/@protomaps/basemaps@5.7.2/+esm"
    }
  }
</script>
<script type="module">
  import { createMapWidget } from "./map-widget-<hash>.js";
  const w = createMapWidget(el, {
    basemapUrl: "pmtiles:///pmtiles/shanghai.pmtiles", // host serves this
    glyphsUrl: "/glyphs/{fontstack}/{range}.pbf",
    center: [121.47, 31.23],
    zoom: 12,
  });
</script>
```

The `+esm` suffix is jsdelivr's ESM transform — react / react-dom ship CJS
only, so a raw file server (e.g. unpkg) cannot serve them as ESM; maplibre /
pmtiles / protomaps also resolve through the same CDN for one consistent
source. The bundle itself is terser-minified (single line, fully mangled) and
content-hashed, so `widget.json` is the version marker: a new build changes
the entry filename (browsers never serve a stale cached copy) and the manifest
lists the exact dependency versions the bundle was built against.

## 6. GitHub Pages deployment

The demo is auto-deployed to GitHub Pages on every push to `main` at
<https://xiongjia.github.io/vine/>. CI injects the build-time tile/glyph URLs
above from two repository-level Actions **variables** (`VITE_PMTILES_URL_PREFIX`
/ `VITE_GLYPHS_URL`) — see [docs/ci.md](./ci.md) for the workflow and the
one-time variable configuration.

The plain-HTML example at `/vine/examples/embed.html` is emitted at build time
by the demo's `embed-html` vite plugin (`apps/demo/vite-embed-html.ts`) and gets
the **same** injected URLs: the widget bundle is referenced from
`<bucket-domain>/vine/widget/` via the hashed names in `widget.json` (derived from
`VITE_PMTILES_URL_PREFIX`, same storage root as the tiles) and the basemaps /
glyphs from `vine/pmtiles/` / `vine/glyphs/`. So besides the two variables, the
bucket must contain the widget bundle (`sync-assets --only widget`) for the
embed example to work; locally it falls back to the dev-only vite plugin mounts
(`/widget`, `/pmtiles`, `/glyphs`), and `vite preview` serves the built
`dist/examples/embed.html` like production.

## 7. maps-cli command reference

Every `vine-maps` command, run via `pnpm --filter=@vine/maps-cli cli <cmd>`:

| Command                 | What it does                                                                                                                                  | Key options                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `build-date`            | Print the latest Protomaps build date `YYYYMMDD` (network)                                                                                    | —                                                                    |
| `extract <region>`      | Remote-crop a region pmtiles into `.maps-cache/pmtiles/` + write `<region>.metadata.json` (network)                                           | `--build`, `--maxzoom`, `--bbox`, `--dry-run`                        |
| `metadata <region>`     | (Re)write `<region>.metadata.json` for an existing `.pmtiles`                                                                                 | `--build`, `--bbox`                                                  |
| `update-metadata [dir]` | Rebuild sidecars for every `*.pmtiles` in a dir + regenerate `pmtiles.json` (default: repo root; relative dirs resolve against the repo root) | `--dry-run`                                                          |
| `verify <region>`       | Run `pmtiles show` and cross-check the sidecar                                                                                                | —                                                                    |
| `list`                  | List regions in `.maps-cache/pmtiles/`                                                                                                        | —                                                                    |
| `upload <region>`       | Upload `<region>.pmtiles` + metadata + `pmtiles.json` (pmtiles-only, per region)                                                              | `--storage`, `--bucket`, `--root`, `--prefix`, `--dry-run`           |
| `rm <region>`           | Delete a region's remote objects + drop it from `pmtiles.json`                                                                                | `--storage`, `--bucket`, `--root`, `--prefix`, `--dry-run`           |
| `sync-assets`           | Sync widget + pmtiles + glyphs in one pass; `--only` restricts to one kind                                                                    | `--only`, `--storage`, `--bucket`, `--root`, `--prefix`, `--dry-run` |
| `gcj2wgs <lng> <lat>`   | Convert GCJ-02 (Amap/Baidu) → WGS-84                                                                                                          | —                                                                    |

Upload / delete commands share the same storage options:

| Option               | Meaning                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `--storage <r2\|s3>` | Storage type (default `r2`)                                               |
| `--bucket <name>`    | Bucket name (overrides `.env` / `VINE_*_BUCKET`)                          |
| `--root <dir>`       | Storage root, e.g. `--root maps` (default `vine`, or `VINE_STORAGE_ROOT`) |
| `--prefix <path>`    | Full base-path override, wins over `--root`                               |
| `--dry-run`          | Print the plan without uploading / deleting                               |

Credentials come from `.env` / `.env.local` at the repo root (see
[Credentials](#2-credentials)); network commands (`build-date`, `extract`) also
need the external `pmtiles` binary (see [docs/pmtiles.md](./pmtiles.md) §1).
Full per-command details and region presets: [docs/pmtiles.md](./pmtiles.md).

### Local metadata & maintenance examples

`update-metadata` regenerates **every** `<region>.metadata.json` sidecar in a
directory (from each file's own header — no preset needed) and rebuilds the
aggregate `pmtiles.json`. Relative `[dir]` paths resolve against the repo root
(`pnpm --filter` runs with cwd = the package dir), default is the repo root
itself; point it at the local cache to refresh everything before publishing:

```bash
pnpm --filter=@vine/maps-cli cli update-metadata .maps-cache/pmtiles   # update ALL metadata sidecars + rebuild pmtiles.json
pnpm --filter=@vine/maps-cli cli update-metadata .maps-cache/pmtiles --dry-run  # preview only, writes nothing
pnpm --filter=@vine/maps-cli cli list                 # what's in the cache
pnpm --filter=@vine/maps-cli cli verify tokyo         # pmtiles show + sidecar cross-check
pnpm --filter=@vine/maps-cli cli gcj2wgs 121.48 31.16 # GCJ-02 (Amap/Baidu) → WGS-84
```

Run `update-metadata` after regenerating local tiles (e.g. a fresh
`extract` with a different `--bbox`) so the uploaded catalog stays in sync
before `sync-assets --only pmtiles`.
