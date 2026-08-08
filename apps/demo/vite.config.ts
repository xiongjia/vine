import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import {
  GLYPHS_SOURCES,
  glyphProxyPlugin,
  localTilesPlugin,
  widgetDistPlugin,
} from "@vine/ui/vite-plugins";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// turbo runs commands from each package dir; repo root = two levels up from apps/demo (.maps-cache lives at the repo root)
const repoRoot = path.resolve(__dirname, "../..");
const cacheDir = process.env.VINE_MAPS_CACHE ?? path.join(repoRoot, ".maps-cache");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      localTilesPlugin(path.join(cacheDir, "pmtiles")),
      glyphProxyPlugin(
        path.join(cacheDir, "glyphs"),
        GLYPHS_SOURCES[env.VITE_GLYPHS_SRC ?? "protomaps"] ?? GLYPHS_SOURCES.protomaps ?? "",
      ),
      widgetDistPlugin(path.join(repoRoot, "packages/ui/dist/widget")),
    ],
    base: "/vine/",
    build: {
      outDir: "dist",
      chunkSizeWarningLimit: 10000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("maplibre-gl")) return "maplibre";
            return "vendor";
          },
        },
      },
    },
  };
});
