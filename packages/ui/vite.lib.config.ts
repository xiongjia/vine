import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { EXTERNAL_DEPS, widgetManifestPlugin } from "./src/lib/widget-build";

/**
 * Library build for the embeddable map widget (see src/widget.tsx).
 *
 * The heavy lifting (externalization, terser minification, content hashing,
 * widget.json manifest) lives in src/lib/widget-build.ts — this config only
 * wires the vite-specific parts. The dev/preview-only plugins (local-tiles,
 * glyph-proxy) are intentionally not included — the widget takes basemap /
 * glyphs URLs as parameters at runtime.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), widgetManifestPlugin()],
  define: {
    // Some dependencies have an unguarded module-level `process.env.NODE_ENV` check
    // (react dev/prod split builds); the browser has no process, so the lib build
    // must replace it statically. External deps are resolved by the host page's
    // CDN, which serves production builds.
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    lib: {
      entry: "src/widget.tsx",
      formats: ["es"],
      // vite 6 lib mode defaults to .mjs for ESM; keep the documented .js name.
      fileName: () => "map-widget.js",
    },
    cssCodeSplit: false,
    // `minify: "terser"` keeps `cssMinify` enabled, but vite deliberately
    // SKIPS terser for lib builds in ESM format — the widget JS is terser-
    // minified inside widgetManifestPlugin (writeBundle) instead, so the
    // emitted bundle is single-line and fully mangled.
    minify: "terser",
    rollupOptions: {
      external: [...EXTERNAL_DEPS],
      output: {
        assetFileNames: "map-widget.css",
      },
    },
    outDir: "dist/widget",
  },
});
