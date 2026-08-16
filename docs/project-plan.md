# Vine Project Plan — README & Demo Improvements

> Phase 1 (P0, docs-only) is **done**. This plan covers the remaining work.
> Priority: **P0** (code) → **P1** (this week) → **P2** (planned).

---

## Phase status

| Phase              | Scope                                                                                                  | Status                    |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------- |
| **P0 (docs-only)** | README hero, GIF/screenshot assets, layered Quick Start, API cheat sheet                               | ✅ Done (no code changed) |
| **P0 (code)**      | Demo fullscreen hero, URL state sync, copy button, widget iframe                                       | ⏳ Next                   |
| **P1**             | Why-Vine table, badges, architecture diagram, footer sections; demo tags, layer panel, mobile, loading | Planned                   |
| **P2**             | Docs site, changelog, npm publish, Studio, perf panel, CLI WASM                                        | Backlog                   |

---

## P0 — Remaining (requires code changes)

### 1. Demo fullscreen hero map

- Replace the stacked `max-w-5xl` layout with a near-fullscreen (≈`85vh`) Shanghai map behind a gradient overlay, big headline, and a "Get Started" CTA scrolling to the examples.
- **Files:** `apps/demo/src/app.tsx` (optionally `apps/demo/src/components/hero.tsx`)
- **Accept:** the first viewport has visual impact.

### 2. URL state sync

- Throttled `onMove` writes `center`/`zoom` to `location.search` (e.g. `?city=shanghai&z=14&lat=..&lng=..`); on load, restore the camera from the URL. `city` selects the Shanghai/Tokyo example.
- **Files:** new `apps/demo/src/hooks/use-url-map-state.ts` (keep `MapView` core untouched unless it is cheap).
- **Accept:** a copied URL restores the exact map state.

### 3. One-click code copy

- `CodeToggle` / `CodeBlock` in `@vine/ui` currently lack a clipboard button — add one (`navigator.clipboard` + success feedback). Ensure all four examples (Shanghai / Tokyo / Styles / Embed) show code.
- **Files:** `packages/ui/src/components/ui/code-toggle.tsx`, `code-block.tsx`, `apps/demo/src/lib/example-snippets.ts`
- **Accept:** every example has code with a working copy button.
- ⚠️ Touches the shared package — run `pnpm exec turbo run test --filter=@vine/ui` for regression.

### 4. Widget inline iframe

- `EmbedDemo` currently links out to `/vine/examples/embed.html` — embed it inline via `<iframe>` (≈480px, rounded border), keep the external link + minimal HTML snippet.
- **Files:** `apps/demo/src/components/examples/embed-demo.tsx`
- **Accept:** the plain-HTML embedding effect is visible without navigation.

### 5. Demo GIF asset ✅ Done

- Recorded a **7.6s GIF** (map showcase → double-click zoom → popup close/reopen → dark mode), **1.2 MB**, at `docs/assets/vine-hero.gif`, referenced in the README hero next to the static shot.
- **Method (automated, reusable):** CDP-driven headless Chrome — `Page.captureScreenshot` with `fromSurface: false` (required, or WebGL canvas content is lost), `Input.dispatchMouseEvent` for dbl-click zoom / clicks / scrolling, ~64 frames at 100 ms, composed with ffmpeg palette (480 px wide, 8 fps, 30 frames, 64-color palette, 1.2 MB).
- **Note:** the GIF has no "tile loading" segment — tiles load too fast locally to capture reliably.
- **Accept:** GIF renders inline on GitHub.

---

## P1 — This week

### README

- **Why Vine comparison table** — vs. Mapbox GL JS / Leaflet: self-hosted tiles, fully static deploy, zero-build embedding, offline, no token.
- **Badges row** — CI build status, license, stars now; npm version / bundle size badges only after publish (P2).
- **Architecture diagram** — one Mermaid diagram distilled from `docs/architecture.md` (monorepo: apps/demo, apps/playground, apps/maps-cli, packages/ui, packages/config).
- **Standard footer sections** — Contributing (link to AGENTS.md or a new CONTRIBUTING.md), License (MIT), Acknowledgements (OSM / Protomaps / MapLibre — partially added already).

### Demo

- **Feature tags** — chips per example: Markers / Track / Dark Mode / Widget / HUD / Flavor switching (`example-meta.ts`).
- **Layer control panel** — toggles for markers / track / HUD on the Shanghai example (pass `markers`/`tracks`/`showCenterHud` conditionally; no core change needed).
- **Mobile polish** — viewport meta exists; add touch-gesture check, stacked card layout on small screens, compact header, hero height.
- **Loading state** — spinner/skeleton until `onMapReady` (demo side, or an optional `fallback` prop on `MapView`).

### Engineering

- **GitHub Release** — tag + release notes (from CHANGELOG, see P2).
- **404.html** — SPA redirect placeholder for future sub-routes (demo is single-page today; embed.html is a static file and already reachable).

---

## P2 — Backlog

| Item                     | Action                                                                                                                                                                                                                 | Accept                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **npm publish**          | Two steps: (1) publishable shape — un-private `@vine/ui`, real version, `build` producing dist + types (exports currently point to `src`), package README/files; (2) actual `npm publish` with `prepublishOnly` checks | `npm i @vine/ui` works                              |
| **Changelog**            | Maintain `CHANGELOG.md` manually or via release-please (from conventional commits)                                                                                                                                     | per-version change log                              |
| **Docs site**            | Migrate `docs/` to a VitePress site (searchable/navigable), deploy on Pages sub-path                                                                                                                                   | standalone docs site                                |
| **Studio**               | Upgrade playground: live map preview + editable code (monaco or textarea), apply props instantly                                                                                                                       | edit `center`/`flavor`/`markers` → map updates live |
| **Performance panel**    | Show tile counts, FPS, memory (maplibre events) to back the "lightweight" claim                                                                                                                                        | real measured data                                  |
| **Multi-device preview** | Widget preview at desktop/tablet/phone viewport widths                                                                                                                                                                 | responsive behavior visualized                      |
| **CLI zero-dependency**  | Wrap the `pmtiles` binary via WASM (`@pmtiles/pmtiles`) or Docker so `cli extract` needs no manual binary install                                                                                                      | extract works out of the box                        |
| **OG image / favicon**   | Brand favicon + social share preview (`docs/assets/og.png` + `index.html` meta)                                                                                                                                        | share cards expand on X/WeChat                      |
| **README badges (npm)**  | npm version + bundlephobia badges — blocked on npm publish                                                                                                                                                             | no 404 badges                                       |

---

## Dependencies & sequencing

1. **P0 #1–#4** (code) are independent of each other and of P1 — do them first.
2. **P0 #5 (GIF)** — done via the automated CDP capture flow; the README hero pairs it with the static shot (`vine-shanghai.png`) for fast first paint.
3. **P1 badges / P2 npm badge** — blocked on **npm publish** (P2). CI/license/star badges can ship in P1.
4. **Quick Start path C** currently documents workspace usage; update to `npm i @vine/ui` after publish.
5. Any change to `@vine/ui` (P0 #3 copy button, P1 loading fallback) must pass `turbo run test --filter=@vine/ui` and re-run `build:widget` so the demo embed stays in sync.

## Out of scope

- Backend / server code, breaking changes to the `MapView` public API, or adding a router framework to the demo.
- This plan itself is the tracked deliverable for P1/P2; per-repo convention, committed docs live in `docs/*.md` (non-`-draft`).

---

_Plan baseline: repo commit `40acdcd` · P0 docs-only shipped 2026-08-16._
