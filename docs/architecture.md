# Vine Architecture

## Overview

Vine is a **fully static map web application** that lets users mark products on a map and organize them with travel notes. It is built as a monorepo with no backend — all data is embedded at build time, and the output is a deployable static site.

---

## 1. Monorepo Design

```
vine/
├── apps/
│   ├── atlas/               # Main map application
│   └── playground/          # UI component documentation sandbox
├── packages/
│   ├── config/              # Shared TypeScript & ESLint configuration
│   └── ui/                  # Reusable UI component library
├── .github/workflows/       # CI pipeline
├── .pi/agents/              # AI subagent definitions
├── AGENTS.md                # AI context entry point
├── pnpm-workspace.yaml      # Workspace definition + catalog protocol
└── turbo.json               # Task orchestration
```

### 1.1 Package Manager: pnpm

pnpm 11 with workspace protocol and catalog dependencies. Shared dependency versions are declared once in `pnpm-workspace.yaml` under the `catalog:` key and referenced via `catalog:` in individual `package.json` files.

### 1.2 Build Orchestration: Turborepo

Turborepo 2 manages task dependencies:

```
build  → depends on ^build (build dependencies first)
lint   → depends on ^lint
test   → depends on ^build
dev    → persistent, no cache
```

Tasks are cached locally and can be shared remotely in CI.

---

## 2. Application Architecture

### 2.1 atlas (`apps/atlas`)

The main application. It is a **single-page application (SPA)** with hash-based routing, designed for static hosting (no server required).

**Route design:**

| Hash route            | View                              |
| --------------------- | --------------------------------- |
| `#/map` (default)     | Full-screen map with all products |
| (future) `#/note/:id` | Note detail view                  |

**Component tree:**

```
App
├── SidebarProvider (context for sidebar state)
│   ├── SidebarAside
│   │   ├── Header (title + ThemeToggle)
│   │   ├── Note filter list (NoteCard[])
│   │   └── Product detail panel (when selected)
│   └── AtlasMap (full-screen)
│       └── Marker[] (product locations)
```

**Data flow:**

```
products.json ──→ App ──→ AtlasMap (markers)
notes.json    ──→ App ──→ Sidebar (note filters)
                      └──→ ProductDetail (when marker clicked)
```

- Static JSON files are imported at build time via Vite's static asset handling.
- Filtering is done client-side by React state (`activeNoteId`).
- No network requests at runtime — the app works fully offline after the initial load.

### 2.2 playground (`apps/playground`)

A documentation sandbox for UI components, powered by MDX files.

**How it works:**

1. Each component has a `.mdx` page under `src/pages/`.
2. MDX files are compiled at build time by `@mdx-js/rollup`.
3. A custom Vite plugin (`mdxCodePreview`) transforms ` ```tsx preview ` fenced code blocks into `<ComponentPreview>` elements that show both the rendered component and its source code side by side.
4. Shiki provides syntax highlighting (supports dark/light themes).

**Pages:**

| Page           | Component | Description                               |
| -------------- | --------- | ----------------------------------------- |
| `overview.mdx` | —         | Card grid linking to all components       |
| `button.mdx`   | Button    | Variants, sizes, disabled, asChild        |
| `card.mdx`     | Card      | Card, CardHeader, CardContent, CardFooter |
| `checkbox.mdx` | Checkbox  | Default, disabled                         |
| `dialog.mdx`   | Dialog    | Modal dialog with header/footer           |
| `sheet.mdx`    | Sheet     | Slide-over panel (left/right)             |
| `map.mdx`      | MapView   | MapLibre GL map component                 |

---

## 3. UI Component Library (`packages/ui`)

Built on **shadcn/ui** (new-york style) with Tailwind CSS v4.

### Component inventory

| Component          | Radix Primitive             | Features                                                                    |
| ------------------ | --------------------------- | --------------------------------------------------------------------------- |
| `Button`           | `@radix-ui/react-slot`      | Variants (default/destructive/outline/secondary/ghost/link), sizes, asChild |
| `Card`             | —                           | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter       |
| `Dialog`           | `@radix-ui/react-dialog`    | Overlay, content, header, footer, close button                              |
| `Sheet`            | `@radix-ui/react-dialog`    | 4 sides (top/bottom/left/right), overlay, close                             |
| `Sidebar`          | —                           | Provider, Aside, Menu, MenuButton, Group, Separator, collapsible            |
| `Separator`        | `@radix-ui/react-separator` | Horizontal/vertical orientations                                            |
| `Tooltip`          | `@radix-ui/react-tooltip`   | Provider, Trigger, Content                                                  |
| `Popover`          | `@radix-ui/react-popover`   | Trigger, Content, Anchor                                                    |
| `Checkbox`         | `@radix-ui/react-checkbox`  | Checked/unchecked, disabled                                                 |
| `Input`            | —                           | Search, text, disabled states                                               |
| `Header`           | —                           | Title, start/end slots, children                                            |
| `Content`          | —                           | Prose typography wrapper (dark mode aware)                                  |
| `ThemeToggle`      | —                           | Dark/light mode toggle (persisted to localStorage)                          |
| `MapView`          | —                           | MapLibre GL with OSM raster tiles                                           |
| `CodeBlock`        | —                           | Shiki syntax highlighted code display                                       |
| `ComponentPreview` | —                           | Side-by-side preview + code for MDX playground                              |

### Styling strategy

- **Tailwind CSS v4** with `@theme` for CSS custom properties.
- Colors defined as HSL variables for both light and dark themes.
- Dark mode toggled by adding `.dark` class to `<html>` and persisted in `localStorage`.
- The `@custom-variant dark` directive maps `.dark` class to Tailwind's `dark:` variant.
- The `@source` directive ensures Tailwind scans the UI package source even when imported from apps.

---

## 4. Map Integration

Uses **MapLibre GL JS** with free OpenStreetMap raster tiles.

### MapView (`packages/ui`)

A basic wrapper that creates a MapLibre map instance with OSM tiles. Used by the playground for documentation.

Props: `center`, `zoom`, `height`, `style`, `className`

### AtlasMap (`apps/atlas`)

An enhanced map component built directly on maplibre-gl for the atlas app. Adds:

- **Navigation control** (zoom in/out)
- **Custom markers** — styled as colored pins with a tag icon
- **Marker click handlers** — clicking a marker calls `onProductSelect` to show the product detail panel
- **Marker lifecycle** — markers are cleaned up when the product list changes or the component unmounts

**Map style:**

```json
{
  "version": 8,
  "sources": {
    "osm": {
      "type": "raster",
      "tiles": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      "tileSize": 256,
      "attribution": "© OpenStreetMap contributors"
    }
  },
  "layers": [{ "id": "osm", "type": "raster", "source": "osm" }]
}
```

---

## 5. Data Model

All data is static JSON files bundled at build time.

### Product

```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  lng: number; // longitude
  lat: number; // latitude
  image?: string; // optional image URL
  tags: string[]; // e.g. ["ceramics", "handicraft"]
  noteId?: string; // reference to a TravelNote
}
```

### TravelNote

```typescript
interface TravelNote {
  id: string;
  title: string;
  date: string; // ISO date string
  summary: string;
  tags: string[];
}
```

---

## 6. CI/CD Pipeline

Defined in `.github/workflows/ci.yml`.

| Job     | Description                           |
| ------- | ------------------------------------- |
| `check` | ESLint + TypeScript type checking     |
| `test`  | Vitest unit tests across all packages |
| `build` | `turbo run build` → upload `apps/atlas/dist/` as Pages artifact |
| `deploy`| Deploy to GitHub Pages (on `main` branch)                  |

Uses `pnpm/action-setup@v6` with Node 24, turbo caching via `actions/cache`, and `actions/deploy-pages@v4` for the final deployment step.

---

## 7. AI Subagents

Configured via `pi-subagents` in `.pi/settings.json`. Builtin agents (`reviewer`, `worker`) are overridden with project-specific system prompts.

The [AGENTS.md](../AGENTS.md) file at the project root serves as the AI context entry, describing project structure, tech stack, coding principles, and development commands.

---

## 8. Key Design Decisions

| Decision           | Choice                | Rationale                                                                            |
| ------------------ | --------------------- | ------------------------------------------------------------------------------------ |
| **No backend**     | Fully static          | Zero operational cost, deployable to any static host (GitHub Pages, Vercel, Netlify) |
| **Data storage**   | JSON files in source  | Simplified editing, version-controlled, no database dependency                       |
| **Map tiles**      | OpenStreetMap raster  | Free, no API key required                                                            |
| **Routing**        | Hash-based (`#/path`) | Works without server-side URL rewriting on static hosts                              |
| **Component docs** | MDX + playground      | Self-documenting, live previews, co-located with code                                |
| **CSS framework**  | Tailwind CSS v4       | Utility-first, CSS variables for theming, small runtime                              |
| **Map library**    | MapLibre GL           | Open-source, lightweight, good TypeScript support                                    |
| **UI primitives**  | Radix + shadcn/ui     | Accessible, unstyled, composable                                                     |

---

## 9. Development Workflow

```bash
# Install
pnpm install

# Dev mode
pnpm exec turbo run dev --filter=@vine/atlas      # Map app (port 5173)
pnpm exec turbo run dev --filter=@vine/playground  # Playground (port 5174)

# Build all
pnpm exec turbo run build

# Run checks
pnpm exec turbo run lint
pnpm exec turbo run test

# Type check
pnpm exec turbo run check-types
```

---

## 10. Future Considerations

- **MDX travel notes**: Notes as `.mdx` files in `apps/atlas/src/notes/` compiled at build time
- **Product markers**: Enhanced popups with images, links, and richer metadata
- **Offline support**: Service worker for full offline capability
- **Vector tiles**: Upgrade from OSM raster to vector tiles for smoother rendering
- **Search**: Client-side full-text search across products and notes
- **Print/export**: Generate printable travel maps or PDF itineraries
