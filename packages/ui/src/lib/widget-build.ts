/**
 * Widget build pipeline used by `build:widget` (packages/ui/vite.lib.config.ts
 * is the thin vite wrapper around this module).
 *
 * The build externalizes third-party runtime deps (react, maplibre, pmtiles,
 * protomaps): rollup `output.paths` rewrites the bare imports to absolute
 * esm.sh URLs inside `map-widget.js`, so the host page needs no import map
 * (Chrome 151 does not apply import maps at all) and callers can serve the
 * heavy libraries from any CDN instead of shipping them inside the bundle
 * (~1.9MB → a few KB).
 *
 * All emitted files are content-hashed (`map-widget-<hash>.js|css`,
 * `import-map-<hash>.json`) and described by the un-hashed `widget.json`
 * manifest (entry/css names, per-file hashes, dependency versions and the
 * ready-to-paste import map) — see widgetManifestPlugin.
 *
 * Kept under src/ so the pipeline is unit-tested and type-checked like the
 * rest of the package.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minify as terserMinify } from "terser";
import type { Plugin } from "vite";
import type { WidgetManifest, WidgetManifestFile } from "./widget-manifest";

const require = createRequire(import.meta.url);

/**
 * Bare specifiers externalized from the widget bundle and rewritten to
 * absolute CDN URLs by rollup `output.paths` (see vite.lib.config.ts).
 * Exact-string matching: `maplibre-gl/dist/maplibre-gl.css` (a different
 * specifier) is still resolved and bundled into widget.css.
 */
export const EXTERNAL_DEPS = [
  "react",
  "react/jsx-runtime",
  "react-dom/client",
  "maplibre-gl",
  "pmtiles",
  "@protomaps/basemaps",
] as const;

/** Package name for a specifier (`react/jsx-runtime` → `react`). */
function packageName(specifier: string): string {
  // split() always returns at least one element, so the leading index is safe.
  return specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0]!;
}

/**
 * Read the installed version of a package: resolve its entry file, then walk
 * up until a package.json is found (pnpm keeps packages in the .pnpm store,
 * so the version must be read from the resolved copy, not from a catalog).
 */
function installedVersion(specifier: string): string {
  const name = packageName(specifier);
  const entry = require.resolve(specifier);
  let dir = path.dirname(entry);
  for (;;) {
    const pkgPath = path.join(dir, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        name?: string;
        version?: string;
      };
      if (pkg.name === name && typeof pkg.version === "string") {
        return pkg.version;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `cannot find installed version of "${specifier}" (resolved to ${entry})`,
      );
    }
    dir = parent;
  }
}

const CDN_BASE = "https://esm.sh";

/**
 * esm.sh URL for a bare specifier, pinned to the installed version:
 * `react/jsx-runtime` → `…/react@19.2.7/jsx-runtime` (esm.sh subpaths are
 * plain path segments). esm.sh — not jsdelivr `+esm` — because maplibre-gl
 * ships an AMD/UMD bundle whose named exports (Map, Marker, Popup, …) only
 * esm.sh's transform preserves (jsdelivr's esbuild conversion produces a
 * default-only export and `import { Marker }` fails at runtime).
 */
function cdnUrl(specifier: string, version: string): string {
  const name = packageName(specifier);
  const subpath = specifier.slice(name.length);
  return `${CDN_BASE}/${name}@${version}${subpath}`;
}

/**
 * Version of the @vine/ui package. `build:widget` runs with cwd = packages/ui,
 * but the config is executed from a vite temp dir (and this file is also
 * imported by unit tests), so import.meta.url cannot be the only source.
 */
function uiPackageVersion(): string {
  for (const candidate of [
    path.join(process.cwd(), "package.json"),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../package.json"),
  ]) {
    try {
      const pkg = JSON.parse(readFileSync(candidate, "utf8")) as {
        name?: string;
        version?: string;
      };
      if (pkg.name === "@vine/ui" && typeof pkg.version === "string") {
        return pkg.version;
      }
    } catch {
      // try the next candidate
    }
  }
  throw new Error("cannot locate the @vine/ui package.json");
}

/**
 * Bare specifier → CDN URL, pinned to the exact installed versions so the
 * host page always loads the same react / maplibre / pmtiles the widget was
 * built and tested against. esm.sh serves production builds (NODE_ENV set),
 * resolves subpaths like `react/jsx-runtime`, and is the only one of the
 * common ESM CDNs whose transform keeps maplibre-gl's named exports (the
 * package ships AMD/UMD — jsdelivr `+esm` drops them). Callers may override
 * any entry with their own CDN or self-hosted files.
 *
 * Also used as rollup `output.paths` in vite.lib.config.ts, which rewrites
 * the bundle's bare imports to these absolute URLs — the emitted
 * `map-widget.js` imports `https://esm.sh/…` directly, so the host page
 * needs no import map (Chrome 151 does not apply import maps at all;
 * the widget must load without one).
 */
export function buildImportMap(): Record<string, string> {
  const react = installedVersion("react");
  const reactDom = installedVersion("react-dom");
  const maplibreGl = installedVersion("maplibre-gl");
  const pmtiles = installedVersion("pmtiles");
  const protomaps = installedVersion("@protomaps/basemaps");
  const versions: Record<string, string> = {
    react,
    "react/jsx-runtime": react,
    "react-dom/client": reactDom,
    "maplibre-gl": maplibreGl,
    pmtiles,
    "@protomaps/basemaps": protomaps,
  };
  return Object.fromEntries(
    Object.entries(versions).map(([specifier, version]) => [
      specifier,
      cdnUrl(specifier, version),
    ]),
  );
}

/**
 * Post-build step that content-hashes every emitted file and writes the
 * `widget.json` manifest:
 *   - `map-widget-<hash12>.js` — widget code only (deps externalized)
 *   - `map-widget-<hash12>.css` — tailwind + maplibre styles
 *   - `import-map-<hash12>.json` — ready-to-use import map for the host page
 *   - `widget.json` — entry/css names, per-file hashes/sizes, dependency
 *     versions and the import map (the file consumers actually read)
 *
 * Content hashing makes the filename change whenever the bundle changes, so
 * a stale cached copy can never be served after a new release.
 */
export function widgetManifestPlugin(): Plugin {
  return {
    name: "vine-widget-manifest",
    async writeBundle(options, bundle) {
      const outDir = options.dir;
      if (!outDir) {
        throw new Error("widget manifest requires output.dir");
      }
      const files: WidgetManifestFile[] = [];
      let entry = "";
      let css = "";
      for (const [fileName] of Object.entries(bundle)) {
        const full = path.join(outDir, fileName);
        let content = readFileSync(full);
        // Vite deliberately skips terser for lib builds in ESM format
        // (`renderChunk` returns null for lib + es) — so the widget JS would
        // ship unminified (multi-line) unless minified here, BEFORE hashing.
        if (fileName.endsWith(".js")) {
          const res = await terserMinify(content.toString(), {
            module: true,
            toplevel: true,
            compress: true,
            mangle: true,
            format: { comments: false },
          });
          if (!res.code) {
            throw new Error(
              `terser produced no output for ${fileName} — refusing to ship an empty widget bundle`,
            );
          }
          content = Buffer.from(res.code);
          writeFileSync(full, content);
        }
        const hash = createHash("sha256").update(content).digest("hex");
        const ext = path.extname(fileName);
        const newName = `${fileName.slice(0, -ext.length)}-${hash.slice(0, 12)}${ext}`;
        renameSync(full, path.join(outDir, newName));
        files.push({ name: newName, hash, size: content.length });
        if (fileName.endsWith(".js")) entry = newName;
        if (fileName.endsWith(".css")) css = newName;
      }
      if (!entry || !css) {
        throw new Error(
          `widget build produced no ${entry ? "css" : "js"} output (got: ${files.map((f) => f.name).join(", ")})`,
        );
      }

      const importMap = buildImportMap();
      const importMapContent = `${JSON.stringify(importMap, null, 2)}\n`;
      const importMapHash = createHash("sha256")
        .update(importMapContent)
        .digest("hex")
        .slice(0, 12);
      const importMapName = `import-map-${importMapHash}.json`;
      writeFileSync(path.join(outDir, importMapName), importMapContent);
      files.push({
        name: importMapName,
        hash: createHash("sha256").update(importMapContent).digest("hex"),
        size: Buffer.byteLength(importMapContent),
      });

      // Remove stale hashed artifacts from previous builds: a changed bundle
      // gets a new hash, leaving the old map-widget-* / import-map-* files
      // behind — they would otherwise be synced to R2 and pile up. Only files
      // matching the widget naming patterns are touched.
      const current = new Set(files.map((f) => f.name));
      const stalePatterns = [
        /^map-widget-.*\.(js|css)$/,
        /^import-map-.*\.json$/,
      ];
      for (const name of readdirSync(outDir)) {
        if (current.has(name)) continue;
        if (stalePatterns.some((re) => re.test(name))) {
          rmSync(path.join(outDir, name), { force: true });
        }
      }

      const dependencies = Object.fromEntries(
        Object.entries(importMap).map(([specifier, cdn]) => [
          specifier,
          { version: installedVersion(specifier), cdn },
        ]),
      );
      const manifest: WidgetManifest = {
        version: uiPackageVersion(),
        buildTime: new Date().toISOString(),
        entry,
        css,
        files,
        dependencies,
        importMap,
      };
      writeFileSync(
        path.join(outDir, "widget.json"),
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
    },
  };
}
