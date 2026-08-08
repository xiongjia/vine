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

export interface EmbedHtmlUrls {
  widgetCss: string;
  widgetJs: string;
  pmtilesPrefix: string;
  glyphs: string;
}

/** Resolve the four URLs from build-time env, falling back to dev defaults. */
export function embedHtmlUrls(
  env: Record<string, string | undefined>,
): EmbedHtmlUrls {
  const prefix = env.VITE_PMTILES_URL_PREFIX ?? DEFAULT_PMTILES_PREFIX;
  const root = storageRoot(prefix);
  return {
    widgetCss: `${root}/widget/map-widget.css`,
    widgetJs: `${root}/widget/map-widget.js`,
    pmtilesPrefix: prefix,
    glyphs: env.VITE_GLYPHS_URL ?? DEFAULT_GLYPHS_URL,
  };
}

/**
 * Substitute the four URL tokens in the template. split/join is used instead
 * of `String.prototype.replace` so `$` sequences in the injected URLs (legal
 * in URLs, e.g. `$&`) are never interpreted as replacement patterns.
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
): Plugin {
  const render = () =>
    renderEmbedHtml(readFileSync(templatePath, "utf8"), embedHtmlUrls(env));

  let mountPath = "/examples/embed.html";
  const serve: Connect.NextHandleFunction = (req, res, next) => {
    const url = (req.url ?? "").split("?")[0] ?? "";
    if (url !== mountPath) return next();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(render());
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
