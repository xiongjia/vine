import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/vine/",
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("maplibre-gl")) return "maplibre";
          if (id.includes("react-dom") || id.includes("react/")) return "react";
          return "vendor";
        },
      },
    },
  },
});
