import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Library build for the embeddable map widget (see src/widget.tsx).
 * Produces `dist/widget/map-widget.js` (ESM, react + maplibre bundled in) +
 * `dist/widget/map-widget.css`. The dev/preview-only plugins
 * (local-tiles, glyph-proxy) are intentionally not included — the widget
 * takes basemap/glyphs URLs as parameters at runtime.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // Some dependencies have an unguarded module-level `process.env.NODE_ENV` check
    // (react dev/prod split builds); the browser has no process, so the lib build
    // must replace it statically.
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
    rollupOptions: {
      output: {
        assetFileNames: "map-widget.css",
      },
    },
    outDir: "dist/widget",
  },
});
