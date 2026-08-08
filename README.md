# Vine 🌿

A fully static map project: a reusable **MapView component** (React + plain-HTML
widget), a **pmtiles region management CLI**, a demo site and a component
playground. No backend — everything is built statically.

```
vine/
├── apps/demo/            # MapView showcase (GitHub Pages entry)
├── apps/playground/      # UI component docs sandbox
├── apps/maps-cli/        # pmtiles extract & R2/S3 upload CLI
├── packages/ui/          # shadcn/ui components + MapView + vite plugins
├── packages/config/      # Shared TypeScript & ESLint config
├── .maps-cache/          # Local pmtiles + glyphs cache (gitignored)
└── docs/                 # Architecture / MapView / pmtiles / publishing
```

## Quick Start

```bash
pnpm install
pnpm --filter=@vine/maps-cli cli extract shanghai   # one-off local cache (needs pmtiles binary)

pnpm exec turbo run dev --filter=@vine/demo          # demo → http://127.0.0.1:5173/vine/
pnpm exec turbo run dev --filter=@vine/playground    # playground
pnpm exec turbo run build:widget --filter=@vine/ui   # widget bundle → packages/ui/dist/widget/
pnpm exec turbo run build
pnpm exec turbo run test
```

## Documentation

- **[docs/architecture.md](docs/architecture.md)** — monorepo layout, apps,
  component library, map stack, CI
- **[docs/mapview.md](docs/mapview.md)** — MapView component design, React &
  widget APIs, compatibility notes
- **[docs/pmtiles.md](docs/pmtiles.md)** — region tile management with
  `maps-cli`, region presets, metadata sidecar, local cache
- **[docs/distribution.md](docs/distribution.md)** — distributing via S3-compatible
  storage (R2/S3) or static widget files: bucket config, sync-assets, build-time URLs
- **[docs/ci.md](docs/ci.md)** — CI pipeline and GitHub Pages deployment, including
  the required repo-level Actions variables for the R2 tile/glyph URLs

## License

MIT
