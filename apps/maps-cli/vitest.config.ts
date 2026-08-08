import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    // Network cases (extract/upload/build-date) are skipped by default; enable locally with `RUN_NETWORK=1 pnpm test`
    // and use the proxy if downloads fail: HTTPS_PROXY=http://127.0.0.1:1095
  },
});
