/**
 * Shared vite dev/preview plugins for serving the local maps cache
 * (`.maps-cache/` at the repo root, gitignored) and the built widget dist.
 *
 * Used by apps/demo and apps/playground dev/preview servers so
 * `pmtiles:///pmtiles/<region>.pmtiles` and `/glyphs/...` resolve
 * same-origin (no CORS, no separate tile server).
 */
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Connect, Plugin } from "vite";

// NOTE: this file is loaded by vite's config bundler as a standalone Node ESM
// module (the @vine/ui/vite-plugins package import stays external to the
// bundle), so relative TS imports would not resolve — keep it self-contained.

// ---------------------------------------------------------------------------
// parseRange — RFC 7233 single-range `Range` header parser (mirrors
// src/lib/http-range.ts; kept in sync manually, see the NOTE above).
// ---------------------------------------------------------------------------
type ParseRangeResult =
  | { status: "ok"; start: number; end: number }
  | { status: "unsatisfiable" }
  | { status: "ignore" };

function parseRange(range: string | undefined, size: number): ParseRangeResult {
  if (!range) return { status: "ignore" };
  const m = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!m) return { status: "ignore" };
  const total = size;
  let start = m[1] === "" ? -1 : Number(m[1]);
  let end = m[2] === "" ? -1 : Number(m[2]);
  if (start === -1) {
    const length = end === -1 ? total : end;
    start = Math.max(total - length, 0);
    end = total - 1;
  } else {
    if (end === -1) end = total - 1;
    end = Math.min(end, total - 1);
  }
  if (start > end || start >= total) return { status: "unsatisfiable" };
  return { status: "ok", start, end };
}

// ---------------------------------------------------------------------------
// local-tiles — serve .maps-cache/pmtiles at /pmtiles (HTTP Range / 206)
// ---------------------------------------------------------------------------
export function localTilesPlugin(tilesDir: string): Plugin {
  const root = path.resolve(tilesDir);
  const mount = "/pmtiles";

  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = (req.url ?? "").split("?")[0] ?? "";
    if (!url.startsWith(`${mount}/`)) return next();
    let rel: string;
    try {
      rel = decodeURIComponent(url.slice(mount.length + 1));
    } catch {
      return next();
    }
    const file = path.join(root, rel);
    if (!file.startsWith(root + path.sep)) return next();

    void (async () => {
      let info;
      try {
        info = await stat(file);
      } catch {
        return next();
      }
      if (!info.isFile()) return next();
      res.statusCode = 200;
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Length", String(info.size));
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      const range = parseRange(req.headers.range, info.size);
      if (range.status === "ok") {
        res.statusCode = 206;
        res.setHeader(
          "Content-Range",
          `bytes ${range.start}-${range.end}/${info.size}`,
        );
        res.setHeader("Content-Length", String(range.end - range.start + 1));
        createReadStream(file, { start: range.start, end: range.end }).pipe(
          res,
        );
        return;
      }
      if (range.status === "unsatisfiable") {
        res.statusCode = 416;
        res.setHeader("Content-Range", `bytes */${info.size}`);
        res.end();
        return;
      }
      createReadStream(file).pipe(res);
    })();
  };

  return {
    name: "local-tiles",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

/** Glyph upstream per source (mirrors scripts/warm-glyphs.ts). */
export const GLYPHS_SOURCES: Record<string, string> = {
  protomaps: "https://protomaps.github.io/basemaps-assets/fonts",
  maplibre: "https://demotiles.maplibre.org/font",
};

// ---------------------------------------------------------------------------
// glyph-proxy — serve .maps-cache/glyphs at /glyphs; download once from the
// upstream fonts host on cache miss (fully offline after a warm-up pass).
// ---------------------------------------------------------------------------
export function glyphProxyPlugin(cacheDir: string, upstream: string): Plugin {
  const cacheRoot = path.resolve(cacheDir);

  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = (req.url ?? "").split("?")[0] ?? "";
    if (!url.startsWith("/glyphs/")) return next();
    let rel: string;
    try {
      rel = decodeURIComponent(url.slice("/glyphs/".length));
    } catch {
      return next();
    }
    const file = path.join(cacheRoot, rel);
    if (!file.startsWith(cacheRoot + path.sep)) return next();

    void (async () => {
      try {
        const info = await stat(file);
        if (info.isFile()) {
          res.setHeader("Content-Type", "application/x-protobuf");
          res.setHeader("Content-Length", String(info.size));
          createReadStream(file).pipe(res);
          return;
        }
      } catch {
        // not cached yet
      }
      try {
        const r = await fetch(`${upstream}/${rel}`);
        if (!r.ok) {
          res.statusCode = r.status;
          res.end();
          return;
        }
        const buf = Buffer.from(await r.arrayBuffer());
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, buf);
        res.setHeader("Content-Type", "application/x-protobuf");
        res.setHeader("Content-Length", String(buf.length));
        res.end(buf);
      } catch {
        next();
      }
    })();
  };

  return {
    name: "glyph-proxy",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

// ---------------------------------------------------------------------------
// widget-dist — serve packages/ui/dist/widget at /widget (for embed.html)
// ---------------------------------------------------------------------------
export function widgetDistPlugin(widgetDir: string): Plugin {
  const root = path.resolve(widgetDir);
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = (req.url ?? "").split("?")[0] ?? "";
    if (!url.startsWith("/widget/")) return next();
    const file = path.join(root, path.basename(url));
    if (!file.startsWith(root + path.sep)) return next();
    void (async () => {
      try {
        const info = await stat(file);
        if (info.isFile()) {
          const ext = path.extname(file);
          res.setHeader(
            "Content-Type",
            ext === ".js"
              ? "text/javascript"
              : ext === ".css"
                ? "text/css"
                : "application/octet-stream",
          );
          res.setHeader("Content-Length", String(info.size));
          createReadStream(file).pipe(res);
          return;
        }
      } catch {
        // fall through
      }
      next();
    })();
  };
  return {
    name: "widget-dist",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
