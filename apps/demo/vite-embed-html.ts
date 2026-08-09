/**
 * Serves the plain-HTML embed example (`examples/embed.html`).
 *
 * The page needs the widget bundle, pmtiles basemaps and glyphs, which only
 * exist as dev vite-plugin mounts (`/widget`, `/pmtiles`, `/glyphs`) locally
 * and as R2 objects (`vine/widget`, `vine/pmtiles`, `vine/glyphs`) in the
 * hosted build. Like the rest of the demo app, the hosted URLs are injected at
 * build time from VITE_PMTILES_URL_PREFIX / VITE_GLYPHS_URL (GitHub Actions
 * variables, see docs/ci.md); the widget URLs are derived from the pmtiles
 * prefix because the bundle lives in the same storage root.
 *
 * The widget build (`build:widget`) emits content-hashed files plus a
 * `widget.json` manifest (entry/css names, per-file hashes, pinned dep
 * versions + CDN URLs) — this plugin reads that manifest and injects the
 * hashed URLs into the template (no import map: the bundle imports its deps
 * as absolute esm.sh URLs directly).
 *
 * - dev: middleware serves the template at `<base>examples/embed.html` with
 *   same-origin URLs backed by the local plugins
 * - build: emits `examples/embed.html` into dist with the env-injected URLs
 * - preview: serves the built dist file (no middleware — preview must behave
 *   like production)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin } from "vite";
import type { WidgetManifest } from "@vine/ui/widget-manifest";

export type { WidgetManifest };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const WIDGET_CSS_TOKEN = "__VINE_WIDGET_CSS__";
export const WIDGET_JS_TOKEN = "__VINE_WIDGET_JS__";
export const PMTILES_PREFIX_TOKEN = "__VINE_PMTILES_PREFIX__";
export const GLYPHS_URL_TOKEN = "__VINE_GLYPHS_URL__";

const DEFAULT_PMTILES_PREFIX = "pmtiles:///pmtiles/";
const DEFAULT_GLYPHS_URL = "/glyphs/{fontstack}/{range}.pbf";

/**
 * `pmtiles://https://cdn.example.com/vine/pmtiles/` → `https://cdn.example.com/vine`
 * `pmtiles:///pmtiles/` (dev default) → `` (so the widget stays same-origin)
 */
export function storageRoot(pmtilesPrefix: string): string {
  return pmtilesPrefix
    .replace(/^pmtiles:\/\//, "")
    .replace(/\/pmtiles\/?$/, "");
}

/** Read the widget manifest from a built `dist/widget` directory. */
export function readWidgetManifest(widgetDir: string): WidgetManifest {
  const manifestPath = path.join(widgetDir, "widget.json");
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8")) as WidgetManifest;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    const cause =
      err.code === "ENOENT"
        ? `no ${manifestPath} — run "pnpm exec turbo run build:widget --filter=@vine/ui" first`
        : `invalid ${manifestPath}: ${err.message}`;
    throw new Error(cause);
  }
}

export interface EmbedHtmlUrls {
  widgetCss: string;
  widgetJs: string;
  pmtilesPrefix: string;
  glyphs: string;
}

/**
 * Resolve the URLs from build-time env + the widget manifest, falling back to
 * dev defaults for the tile/glyph URLs. `manifest` is injectable for tests.
 * No import map is injected: the bundle already imports its external deps as
 * absolute CDN URLs (rollup `output.paths`), so the page loads without one.
 */
export function embedHtmlUrls(
  env: Record<string, string | undefined>,
  manifest: WidgetManifest,
): EmbedHtmlUrls {
  const prefix = env.VITE_PMTILES_URL_PREFIX ?? DEFAULT_PMTILES_PREFIX;
  const root = storageRoot(prefix);
  return {
    widgetCss: `${root}/widget/${manifest.css}`,
    widgetJs: `${root}/widget/${manifest.entry}`,
    pmtilesPrefix: prefix,
    glyphs: env.VITE_GLYPHS_URL ?? DEFAULT_GLYPHS_URL,
  };
}

/**
 * Substitute the URL tokens in the template. split/join is used instead of
 * `String.prototype.replace` so `$` sequences in the injected URLs (legal in
 * URLs, e.g. `$&`) are never interpreted as replacement patterns.
 */
export function renderEmbedHtml(template: string, urls: EmbedHtmlUrls): string {
  const tokens: Array<[string, string]> = [
    [WIDGET_CSS_TOKEN, urls.widgetCss],
    [WIDGET_JS_TOKEN, urls.widgetJs],
    [PMTILES_PREFIX_TOKEN, urls.pmtilesPrefix],
    [GLYPHS_URL_TOKEN, urls.glyphs],
  ];
  let html = template;
  for (const [token, value] of tokens) {
    html = html.split(token).join(value);
  }
  return html;
}

export function embedHtmlPlugin(
  templatePath: string,
  env: Record<string, string | undefined>,
  widgetDir: string,
): Plugin {
  // Read the manifest on every render so a rebuilt widget (dev) is picked up
  // without restarting the dev server; missing/invalid manifests surface as a
  // clear error at the point of use instead of a silent 404.
  const render = () => {
    const manifest = readWidgetManifest(widgetDir);
    return renderEmbedHtml(
      readFileSync(templatePath, "utf8"),
      embedHtmlUrls(env, manifest),
    );
  };

  let mountPath = "/examples/embed.html";
  const serve: Connect.NextHandleFunction = (req, res, next) => {
    const url = (req.url ?? "").split("?")[0] ?? "";
    if (url !== mountPath) return next();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    try {
      res.end(render());
    } catch (error) {
      res.statusCode = 500;
      res.end(`<pre>${(error as Error).message}</pre>`);
    }
  };

  return {
    name: "demo-embed-html",
    configResolved(config) {
      const base = config.base.endsWith("/") ? config.base : `${config.base}/`;
      mountPath = `${base}examples/embed.html`;
    },
    configureServer(server) {
      server.middlewares.use(serve);
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "examples/embed.html",
        source: render(),
      });
    },
  };
}

/** Resolve the template path from this file's location (apps/demo). */
export function embedHtmlTemplatePath(): string {
  return path.resolve(__dirname, "examples/embed.html");
}
