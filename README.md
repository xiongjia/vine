# Vine 🌿

A static map web app for marking products on a map and creating travel notes — built as a static site with no backend.

## Project Structure

```
vine/
├── apps/
│   ├── atlas/          # Main map application
│   └── playground/     # UI component playground (MDX-driven)
├── packages/
│   ├── ui/             # shadcn/ui component library + MapView
│   └── config/         # Shared TypeScript & ESLint config
├── .github/workflows/  # GitHub Actions CI
└── .pi/agents/         # AI subagent definitions
```

## Tech Stack

| Layer               | Choice                                              |
| ------------------- | --------------------------------------------------- |
| Package Manager     | pnpm 11 (workspace + catalog protocol)              |
| Build Orchestration | Turborepo 2                                         |
| Framework           | React 19 + TypeScript 5                             |
| Bundler             | Vite 6                                              |
| CSS                 | Tailwind CSS 4 + PostCSS                            |
| UI Components       | shadcn/ui (new-york style) + Radix primitives       |
| Icons               | lucide-react                                        |
| Map                 | MapLibre GL (OpenStreetMap tiles, free, no API key) |
| Testing             | Vitest + @testing-library/react                     |
| CI/CD               | GitHub Actions → GitHub Pages                       |
| AI Agents           | pi-subagents                                        |

## Apps

### atlas (`apps/atlas`)

The main map application. Features:

- Full-screen interactive map with MapLibre GL
- Product markers on the map with custom popups
- Travel notes sidebar for filtering
- Static JSON data bundled at build time (no backend)
- Hash-based routing for static deployment

### playground (`apps/playground`)

UI component documentation and testing sandbox.

- MDX-driven pages with live code previews (` ```tsx preview `)
- Shiki syntax highlighting (dark/light)
- Component search (⌘K)
- Sidebar navigation with collapsible layout

## Quick Start

```bash
# Install dependencies
pnpm install

# Start atlas (map app)
pnpm exec turbo run dev --filter=@vine/atlas

# Start playground (component docs)
pnpm exec turbo run dev --filter=@vine/playground

# Build everything
pnpm exec turbo run build

# Run all tests
pnpm exec turbo run test
```

## Design

See [docs/architecture.md](./docs/architecture.md) for detailed architecture documentation.

## License

MIT
