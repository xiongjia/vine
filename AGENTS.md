## Project Structure

```
vine/
├── apps/                  # Vite + React applications
│   ├── atlas/
│   └── playground/
├── packages/              # Shared packages
│   ├── config/
│   └── ui/
├── .github/               # GitHub Actions CI
├── .claude/               # Claude Code skills
├── .pi/                   # pi-agent skills & config
├── .vscode/               # VSCode project settings
├── docs/                  # Documentation
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Tech Stack

- **Package Manager**: pnpm 11.x (monorepo workspace, catalog protocol)
- **Build Tool**: Turborepo 2.x (task orchestration)
- **Frontend**: React 19.x with shadcn/ui + Tailwind CSS v4
- **Map**: MapLibre GL (OpenStreetMap tiles, no API key needed)
- **Documentation**: MDX with Shiki syntax highlighting (playground)
- **Testing**: Vitest + @testing-library/react
- **CI/CD**: GitHub Actions (lint, test, build, deploy to Pages)

## DEV Environment Tips

```bash
pnpm install                              # Install dependencies
pnpm exec turbo run dev --filter=@vine/playground  # Start playground
pnpm exec turbo run dev --filter=@vine/atlas       # Start atlas app
pnpm exec turbo run build                 # Build all packages
pnpm exec turbo run format                # Format code with prettier
pnpm exec turbo run lint                  # Lint all packages
pnpm exec turbo run test                  # Run all tests
pnpm exec turbo run test --filter=@vine/ui # Run UI tests only
```

## Coding Principles

1. **No backend**: All data is static JSON/MDX bundled at build time.
2. **Shared components in @vine/ui**: Reusable components go in the UI package. Import via `@vine/ui` — never use relative paths for shared components.
3. **Avoid `any`**: Use proper TypeScript typing. If `any` is unavoidable, add a comment explaining why.
4. **File naming**: kebab-case (`my-component.tsx`). PascalCase only for entry points like `App.tsx`, `main.tsx`.
5. **Tests co-located**: Test files live next to source files (`*.test.tsx` / `*.test.ts`).
6. **Arrow functions preferred**: Use `const fn = () => {}` over `function` declarations.
7. **Code review before push**: All changes should be reviewed before pushing to remote branches.
8. **prettier formatting**: Run `pnpm format` before committing. VSCode saves with prettier automatically.

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
