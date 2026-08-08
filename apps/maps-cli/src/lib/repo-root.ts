import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Locate the monorepo root by walking up from `cwd` until a
 * `pnpm-workspace.yaml` is found (turbo runs commands from each package dir,
 * so `process.cwd()` is NOT the repo root). `VINE_ROOT` overrides.
 */
export function findRepoRoot(start = process.cwd()): string {
  if (process.env.VINE_ROOT) return process.env.VINE_ROOT;
  let dir = start;
  for (;;) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("repo root not found (missing pnpm-workspace.yaml)");
    dir = parent;
  }
}

/** Local cache dir (pmtiles + glyphs), gitignored; env `VINE_MAPS_CACHE` relocates. */
export function mapsCacheDir(repoRoot = findRepoRoot()): string {
  return process.env.VINE_MAPS_CACHE ?? path.join(repoRoot, ".maps-cache");
}

export const PMTILES_DIR_NAME = "pmtiles";
export const GLYPHS_DIR_NAME = "glyphs";

export function pmtilesDir(repoRoot = findRepoRoot()): string {
  return path.join(mapsCacheDir(repoRoot), PMTILES_DIR_NAME);
}

export function glyphsDir(repoRoot = findRepoRoot()): string {
  return path.join(mapsCacheDir(repoRoot), GLYPHS_DIR_NAME);
}
