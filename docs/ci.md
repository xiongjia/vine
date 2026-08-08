# CI & GitHub Pages Deployment

Vine's CI lives in `.github/workflows/ci.yml`. On every push / pull request it
runs lint, unit tests and a full build; on every push to `main` it also
auto-deploys the demo to **GitHub Pages** at
<https://xiongjia.github.io/vine/> (Vite `base: "/vine/"`).

## 1. Pipeline overview

| Job      | Runs on         | What it does                                                                                                                                   |
| -------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint`   | every push / PR | `turbo run lint` + `turbo run check-types`                                                                                                     |
| `test`   | every push / PR | `turbo run test` (Vitest)                                                                                                                      |
| `build`  | every push / PR | `turbo run build` + `turbo run build:widget`; on `main` also validates the R2 URL variables and uploads `apps/demo/dist` as the Pages artifact |
| `deploy` | `main` only     | `actions/deploy-pages` publishes the artifact to the `github-pages` environment                                                                |

PRs never deploy — the Pages artifact upload and the `deploy` job are both
gated on `github.ref == 'refs/heads/main'`.

Deploys are serialized with `concurrency: group: pages, cancel-in-progress: true`
so parallel runs cannot land out of order (the same pattern used by
`xiongjia.github.com`).

## 2. The build depends on R2 URLs

The demo reads tile/glyph URLs at **build time** (see
[docs/distribution.md](./distribution.md) §4). In CI they are injected into the
`build` job as Vite build params:

| Variable                  | Purpose                              | Example value                                                   |
| ------------------------- | ------------------------------------ | --------------------------------------------------------------- |
| `VITE_PMTILES_URL_PREFIX` | PMTiles URL prefix for the map tiles | `pmtiles://https://pub-<hash>.r2.dev/vine/pmtiles/`             |
| `VITE_GLYPHS_URL`         | Glyph font URL template              | `https://pub-<hash>.r2.dev/vine/glyphs/{fontstack}/{range}.pbf` |

(`<bucket-domain>` is the r2.dev public URL or your R2 custom domain — see
[docs/distribution.md](./distribution.md) §4 for per-provider forms.)

These are **not** committed anywhere. The workflow reads them from
**repository-level Actions variables**:

```yaml
env:
  VITE_PMTILES_URL_PREFIX: ${{ vars.VITE_PMTILES_URL_PREFIX }}
  VITE_GLYPHS_URL: ${{ vars.VITE_GLYPHS_URL }}
```

A guard step in the `build` job fails the `main` build with a clear message if
either variable is missing (without them the hosted page would silently fall
back to local dev defaults and render an empty map). PR builds skip the guard,
so the variables only matter once code lands on `main`.

> Note: both variables are listed in `turbo.json` `globalEnv`, so turbo
> invalidates its build cache whenever the URLs change — a stale cached build
> can never be deployed with the old tile URLs.

## 3. Configuring the GitHub repo variables

These are **Actions variables** (non-secret config), not secrets — the URLs
point at a public bucket, and plain `vars.` names are enough.

**Steps** (repo admin required):

1. Open <https://github.com/xiongjia/vine/settings/variables/actions> — or in
   the repo: **Settings → Secrets and variables → Actions → Variables**.
2. Click **New repository variable** and create:

   | Name                      | Value                                                         |
   | ------------------------- | ------------------------------------------------------------- |
   | `VITE_PMTILES_URL_PREFIX` | `pmtiles://https://<bucket-domain>/vine/pmtiles/`             |
   | `VITE_GLYPHS_URL`         | `https://<bucket-domain>/vine/glyphs/{fontstack}/{range}.pbf` |

   Replace `<bucket-domain>` with your real R2 public domain, e.g.
   `pmtiles://https://pub-abc123.r2.dev/vine/pmtiles/`.

3. Verify the map once on the deployed page: the tile/glyph requests in the
   browser network tab must hit `https://<bucket-domain>/vine/...`.

If the bucket layout differs (a different `--root` or `--prefix`, see
[docs/distribution.md](./distribution.md) §1), adjust the paths in both values
accordingly.

## 4. GitHub Pages settings (one-time)

1. **Settings → Pages** → **Source: GitHub Actions** (the workflow drives the
   deploy; no branch-based publishing).
2. Optionally set a **custom domain** under the same page; the workflow URL is
   `https://xiongjia.github.io/vine/` by default.
3. Confirm the environment shows up under **Settings → Environments →
   github-pages** after the first successful deploy.

## 5. Redeploying / debugging

- **Manual redeploy**: run the **CI** workflow manually
  (Actions → CI → _Run workflow_) — it deploys whenever the run happens on
  `main`.
- **Deploy failed**: check the `build` job log for the
  `Check R2 asset URLs are configured` step (variables missing), or the
  `deploy` job log (Pages environment not ready / permissions). A red
  `github-pages` environment means the deploy job itself failed.
- **Everything green but map is empty**: confirm the variables' paths match
  the actual bucket layout and that R2 CORS allows the `https://xiongjia.github.io`
  origin (see [docs/distribution.md](./distribution.md) §3).
