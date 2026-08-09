# Vine Architecture

## Overview

Vine is a **fully static map project** built around a reusable **MapView component**
(MapLibre GL + Protomaps pmtiles basemaps), an **embeddable map widget** (plain-HTML
entry), a **pmtiles management CLI** (`maps-cli`), a demo site and a component
playground. There is no backend — everything is built statically and the map data
(pmtiles + glyphs) is served either from a local cache in dev or from R2/S3 in
production.

---

## 1. Monorepo Design

```
vine/
├── apps/
│   ├── demo/               # MapView showcase site + future GitHub Pages entry
│   ├── playground/         # UI component documentation sandbox (local use)
│   └── maps-cli/           # pmtiles region extract & R2/S3 upload CLI
├── packages/
│   ├── config/             # Shared TypeScript & ESLint configuration
│   └── ui/                 # Component library + MapView + vite plugins
├── .maps-cache/            # Local pmtiles + glyphs cache (gitignored, machine-local)
├── docs/                   # Architecture / MapView / pmtiles / publishing docs
├── .github/workflows/      # CI (lint, unit tests, build — Pages deploy disabled)
├── AGENTS.md               # AI context entry point
├── pnpm-workspace.yaml     # Workspace definition + catalog protocol
└── turbo.json              # Task orchestration
```

### 1.1 Package Manager: pnpm

pnpm 11 with workspace protocol and catalog dependencies. Shared dependency
versions are declared once in `pnpm-workspace.yaml` under the `catalog:` key and
referenced via `catalog:` in each `package.json`.

### 1.2 Build Orchestration: Turborepo

```
build         → depends on ^build, outputs dist/**
build:widget  → depends on ^build, outputs dist/widget/**
lint          → depends on ^lint
check-types   → depends on ^build
test          → depends on ^build, no cache
dev           → persistent, no cache
```

Map-related versions are pinned in the catalog (`maplibre-gl ^5.24.0`,
`pmtiles ^4.4.1`, `@protomaps/basemaps ^5.7.2`) — MapLibre v6 is incompatible
with the pmtiles protocol, so the version stays locked to v5.

---

## 2. Applications

### 2.1 demo (`apps/demo`)

A presentation-first showcase of MapView: big maps with minimal text, a
collapsible "View code" snippet per example, an interactive style switcher and a
link to the plain-HTML embed example. Data is the demo's own Chinese sample data
from `packages/ui/src/lib/sample-data.ts`.

Sections are split into `apps/demo/src/components/examples/*`:
`shanghai-demo`, `tokyo-demo`, `styles-demo`, `embed-demo`.

The dev/preview Vite server mounts three plugins (from
`@vine/ui/vite-plugins`):

| Plugin        | Mount        | Purpose                                               |
| ------------- | ------------ | ----------------------------------------------------- |
| `local-tiles` | `/pmtiles/*` | Serve `.maps-cache/pmtiles` with HTTP Range/206       |
| `glyph-proxy` | `/glyphs/*`  | Serve `.maps-cache/glyphs`, downloading on cache miss |
| `widget-dist` | `/widget/*`  | Serve the built widget (`packages/ui/dist/widget`)    |

Tile/glyph URLs are injected at build time (`VITE_PMTILES_URL_PREFIX`,
`VITE_GLYPHS_URL`); local dev defaults to the same-origin cache.

### 2.2 playground (`apps/playground`)

A documentation sandbox for UI components, powered by MDX files with live
previews (` ```tsx preview ` fenced blocks transformed by a custom Vite plugin
into `<ComponentPreview>`). Shiki provides syntax highlighting.

The sidebar groups pages into **Overview → Maps → Components**. The map page
uses local English demo data (with a single Chinese marker to demonstrate CJK
label rendering).

### 2.3 maps-cli (`apps/maps-cli`)

A Node CLI (commander) for pmtiles region management. It shells out to the
external `pmtiles` / `go-pmtiles` binary (installed by the developer; see
[docs/pmtiles.md](./pmtiles.md)). Commands: `build-date`, `extract`,
`metadata`, `update-metadata`, `verify`, `list`, `upload`, `rm`, `sync-assets`, `gcj2wgs`.

---

## 3. UI Component Library (`packages/ui`)

Built on **shadcn/ui** (new-york style) with Tailwind CSS v4, all kebab-case
files, ESM (`"type": "module"`), source-consumed via exports:

```
"."             → src/index.ts
"./globals.css" → src/globals.css
"./vite-plugins"→ vite/plugins.ts   (local-tiles / glyph-proxy / widget-dist)
```

### Component inventory (current)

| Component          | Notes                                                      |
| ------------------ | ---------------------------------------------------------- |
| `Button`           | Variants, sizes, asChild                                   |
| `Card`             | Card + Header/Title/Description/Content/Footer             |
| `Checkbox`         | Radix checkbox                                             |
| `CodeBlock`        | Shiki syntax-highlighted code                              |
| `CodeToggle`       | Collapsible example code block (used by demo)              |
| `ComponentPreview` | Side-by-side preview + code for MDX playground             |
| `Content`          | Prose typography wrapper                                   |
| `Dialog` / `Sheet` | Radix dialogs (modal / slide-over)                         |
| `GithubIcon`       | Inline SVG brand icon (lucide 1.x dropped brand icons)     |
| `Header`           | Title + start/children/end slots                           |
| `Input`            | Text input                                                 |
| `MapView`          | MapLibre + Protomaps (see [docs/mapview.md](./mapview.md)) |
| `Sidebar`          | Provider + Aside + Menu (used by playground)               |
| `ThemeToggle`      | Dark/light toggle persisted to localStorage                |
| `Tooltip`          | Radix tooltip                                              |
| hooks              | `useIsMobile`, `useHashRoute`                              |

Everything exported from `@vine/ui` has unit tests (77 total).

### Styling

Tailwind CSS v4 with `@theme` HSL variables, `.dark` class variant, and
`@plugin "@tailwindcss/typography"` registered in `globals.css`. Each app has
its own CSS entry that imports the shared globals and adds its own `@source`
so app-level utilities are scanned.

---

## 4. Map Stack

See [docs/mapview.md](./docs/mapview.md) for the component design and
[docs/pmtiles.md](./docs/pmtiles.md) for tile data management.

Key pieces:

- **MapView** (`packages/ui/src/components/ui/map-view.tsx`) — thin React
  wrapper over a framework-agnostic `MapController`.
- **MapController** (`packages/ui/src/lib/map/map-controller.ts`) — owns the
  MapLibre instance: lifecycle, camera (`flyTo`/`fitBounds`), events, layer and
  source management, runtime HUD.
- **Specs / layers** — `MarkerSpec`/`TrackSpec` public API converted to GeoJSON
  (`geojson.ts`), rendered by `marker-layer` (DOM markers) and `track-layer`
  (GeoJSON line layers).
- **Basemap style** — `createProtomapsStyle` builds a vector style from
  `@protomaps/basemaps` flavors (light/dark/white/black/grayscale) with an
  overridable attribution.
- **Widget** (`packages/ui/src/widget.tsx`) — `createMapWidget(el, options)`
  mounts the same MapView into any element; built by `build:widget` into a
  small ESM bundle with react/maplibre/pmtiles externalized
  (`dist/widget/map-widget-<hash>.js|css` + `widget.json` manifest).
- **Local cache** (`.maps-cache/`) — pmtiles files + glyph PBFs, served by the
  Vite plugins in dev; never committed.

---

## 5. CI/CD

Defined in `.github/workflows/ci.yml`. Three jobs, no Pages deployment
(temporarily disabled during the refactor):

| Job     | Steps                                             |
| ------- | ------------------------------------------------- |
| `lint`  | `turbo run lint` + `turbo run check-types`        |
| `test`  | `turbo run test` (unit tests across all packages) |
| `build` | `turbo run build` + `turbo run build:widget`      |

GitHub Pages deploy is commented/disabled; the restore instructions live in
[docs/distribution.md](./distribution.md)

---

## 6. Key Design Decisions

| Decision                | Choice                                                           | Rationale                                                                                      |
| ----------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **No backend**          | Fully static                                                     | Zero operational cost, deployable to any static host                                           |
| **Map tiles**           | Protomaps pmtiles (vector)                                       | Small region files, HTTP Range reads, R2/S3-friendly, no API key                               |
| **MapLibre version**    | v5 pinned                                                        | v6 is incompatible with the pmtiles protocol                                                   |
| **Region data**         | `.pmtiles` + `*.metadata.json` sidecars + `pmtiles.json` catalog | Bounds available without parsing the binary; one catalog file lists every region and its tiles |
| **Cache naming**        | `.maps-cache/` at repo root                                      | Shared by all apps; plugins resolve via repo root (turbo runs per package)                     |
| **Widget distribution** | Static ESM files, no npm                                         | Hand JS/CSS to hosts or publish via R2                                                         |
| **Component docs**      | MDX + playground + unit tests                                    | Self-documenting with live previews                                                            |
| **CI**                  | lint/test/build, no deploy                                       | Pages deploy re-enabled after the refactor                                                     |

---

## 7. Development Workflow

```bash
pnpm install

# Local cache (one-off, machine-local)
pnpm --filter=@vine/maps-cli cli extract shanghai
pnpm --filter=@vine/maps-cli cli extract tokyo

# Dev
pnpm exec turbo run dev --filter=@vine/demo        # demo (port 5173, /vine/)
pnpm exec turbo run dev --filter=@vine/playground  # playground (port 5174)

# Widget build
pnpm exec turbo run build:widget --filter=@vine/ui

# Checks
pnpm exec turbo run lint
pnpm exec turbo run check-types
pnpm exec turbo run test
pnpm exec turbo run build
```
