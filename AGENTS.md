## Project Structure

```
vine/
├── apps/                  # Vite + React applications
│   ├── demo/              # MapView showcase site (future GitHub Pages entry)
│   ├── playground/        # UI component docs sandbox (local use)
│   └── maps-cli/          # pmtiles region extract & R2/S3 upload CLI
├── packages/              # Shared packages
│   ├── config/            # Shared TypeScript & ESLint config
│   └── ui/                # Component library + MapView + vite plugins
├── .maps-cache/           # Local pmtiles + glyphs cache (gitignored)
├── .github/               # GitHub Actions CI (lint / test / build, no deploy)
├── docs/                  # Architecture / MapView / pmtiles / publishing docs
├── .claude/               # Claude Code skills
├── .pi/                   # pi-agent skills & config
├── .vscode/               # VSCode project settings
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Tech Stack

- **Package Manager**: pnpm 11.x (monorepo workspace, catalog protocol)
- **Build Tool**: Turborepo 2.x (task orchestration)
- **Frontend**: React 19.x with shadcn/ui + Tailwind CSS v4
- **Map**: MapLibre GL v5 (pinned) + Protomaps pmtiles basemaps (see [docs/mapview.md](docs/mapview.md))
- **Tile management**: external `pmtiles`/`go-pmtiles` CLI via `apps/maps-cli` (see [docs/pmtiles.md](docs/pmtiles.md))
- **Distribution**: static widget files or S3-compatible storage (see [docs/distribution.md](docs/distribution.md))
- **Documentation**: MDX with Shiki syntax highlighting (playground)
- **Testing**: Vitest + @testing-library/react
- **CI/CD**: GitHub Actions (lint, unit tests, build; Pages deploy disabled during refactor)

## DEV Environment Tips

```bash
pnpm install                              # Install dependencies
pnpm --filter=@vine/maps-cli cli extract shanghai   # one-off local cache (needs pmtiles binary)
pnpm exec turbo run dev --filter=@vine/playground  # Start playground
pnpm exec turbo run dev --filter=@vine/demo        # Start demo (map showcase)
pnpm exec turbo run build                 # Build all packages
pnpm exec turbo run build:widget --filter=@vine/ui  # Widget bundle
pnpm exec turbo run format                # Format code with prettier
pnpm exec turbo run lint                  # Lint all packages
pnpm exec turbo run test                  # Run all tests
pnpm exec turbo run test --filter=@vine/ui # Run UI tests only
```

## Coding Principles

1. **No backend**: All data is static JSON/MDX bundled at build time.
2. **Shared components in @vine/ui**: Reusable components go in the UI package. Import via `@vine/ui` — never use relative paths for shared components.
3. **Avoid `any`**: Use proper TypeScript typing. If `any` is unavoidable, add a comment explaining why.
4. **File naming**: kebab-case for ALL files, including app entries — `app.tsx`, `main.tsx`, `my-component.tsx` (shadcn convention). No PascalCase filenames. Component export names stay PascalCase (`MapView`, `CodeToggle`).
5. **Tests co-located**: Test files live next to source files (`*.test.tsx` / `*.test.ts`).
6. **Arrow functions preferred**: Use `const fn = () => {}` over `function` declarations.
7. **No Chinese in code comments**: Comments and code strings are written in English; Chinese characters are allowed only in example data (e.g. `sample-data.ts` marker labels, region presets).
8. **`*-draft.md` files are temporary**: Draft docs (gitignored by `*-draft.md`) are scratch notes — never reference them from committed code, docs, or config. Committed docs live in `docs/*.md` (see `docs/` index in the README).
9. **No unapproved commits; avoid pushing**: Never commit without the developer's explicit approval, and avoid pushing to the remote unless explicitly asked. Keep work local and staged — the developer decides when to commit and push.
10. **Plan first, execute only on "start"**: When discussing a plan, do not begin executing it until the developer explicitly says to start (e.g. “开始” / “go”). Use the discussion to finalize the plan first.
11. **Code review before push**: All changes should be reviewed before pushing to remote branches.
12. **prettier formatting**: Run `pnpm format` before committing. VSCode saves with prettier automatically.
13. **Debug with DOM dumps, not screenshots**: Models cannot view images by default — when debugging UI/layout issues, dump the rendered DOM (`chrome --headless --dump-dom`) or measure the live page via CDP `Runtime.evaluate` (element widths, classes, computed styles), and describe findings in **English** with concrete measured values. If WebGL is required (MapLibre maps), add `--enable-unsafe-swiftshader` to headless Chrome.
14. **Never leak secrets from `.env`**: Do not hardcode, log, commit, or document real credentials from `.env` / `.env.local` (R2/S3 access keys, secret keys, tokens, endpoints with account IDs). Use placeholders (`...` / `<...>`) in code, tests, docs, and CLI output. Only `.env.example` may list variable names, and it must never contain real values. Before committing, scan `git diff` / `git status` to confirm no real secret value is staged; never echo or print env values in debug output or screenshots/DOM dumps.

## Commit Message Convention

Every commit message must use one of the following prefixes:

| Prefix      | When to use                                     |
| ----------- | ----------------------------------------------- |
| `feat:`     | New feature or component                        |
| `fix:`      | Bug fix, typo correction, or behavior fix       |
| `docs:`     | Documentation-only changes                      |
| `refactor:` | Code restructuring with no behavior change      |
| `test:`     | Adding or updating tests                        |
| `chore:`    | Tooling, config, dependencies, CI, formatting   |
| `style:`    | Code style / formatting only (Prettier, ESLint) |

Examples:

```
feat: add product marker popup with detail panel
fix: correct marker cleanup on product list change
docs: add architecture design doc
chore: pin pnpm version in CI
```

Scope is optional — for changes specific to one package, append the package name:

```
feat(ui): add DatePicker component
fix(atlas): handle empty note filter state
```

## Code Review

When asked to review code, use the **code-review** skill:

- **For Claude Code**: The skill is at `.claude/skills/code-review.md`
- **For pi-agent**: The skill is at `.pi/skills/code-review/SKILL.md`

The skill performs strict diff review covering correctness, security, performance, readability, consistency, and naming issues.
