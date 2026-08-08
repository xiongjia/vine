import { mkdir } from "node:fs/promises";
import path from "node:path";
import { buildMetadata, writeMetadata } from "../lib/metadata";
import { findRepoRoot, pmtilesDir } from "../lib/repo-root";
import { runPmtiles } from "../lib/run-pmtiles";
import { REGION_PRESETS, resolveBbox } from "../presets";
import { latestBuildDate } from "./build-date";

export interface ExtractOptions {
  build?: string;
  /** Raw --maxzoom value (validated + converted in extractRegion). */
  maxzoom?: string;
  bbox?: string;
  dryRun?: boolean;
}

/**
 * `pmtiles extract` remote-crops the global basemap by bbox into .maps-cache/pmtiles/<region>.pmtiles,
 * and writes a `<region>.metadata.json` sidecar (lng/lat bounds).
 * Network command (remote crop from build.protomaps.com, no full download).
 */
export async function extractRegion(
  region: string,
  opts: ExtractOptions,
): Promise<void> {
  const repoRoot = findRepoRoot();
  const outDir = pmtilesDir(repoRoot);
  await mkdir(outDir, { recursive: true });

  const bbox = resolveBbox(region, opts.bbox);
  if (opts.build && !/^\d{8}$/.test(opts.build)) {
    throw new Error(`invalid --build: ${opts.build} (expected YYYYMMDD)`);
  }
  const build = opts.build ?? (await latestBuildDate());
  const url = `https://build.protomaps.com/${build}.pmtiles`;
  const out = path.join(outDir, `${region}.pmtiles`);
  const maxzoom =
    opts.maxzoom === undefined
      ? (REGION_PRESETS[region]?.defaultMaxZoom ?? 15)
      : Number(opts.maxzoom);
  if (!Number.isInteger(maxzoom) || maxzoom <= 0) {
    throw new Error(
      `invalid --maxzoom: ${opts.maxzoom ?? maxzoom} (expected a positive integer)`,
    );
  }

  console.log(
    `region=${region} bbox=${bbox.join(",")} build=${build} maxzoom=${maxzoom}`,
  );
  runPmtiles(
    ["extract", url, out, `--bbox=${bbox.join(",")}`, `--maxzoom=${maxzoom}`],
    { dryRun: opts.dryRun },
  );
  if (opts.dryRun) return;

  const show = runPmtiles(["show", out], { quiet: true });
  const meta = await buildMetadata({
    name: region,
    bbox,
    buildDate: build,
    file: out,
    showText: show.stdout,
  });
  await writeMetadata(meta, outDir);
  console.log(
    `✓ ${out} + ${region}.metadata.json (${(meta.sizeBytes / 1024 / 1024).toFixed(1)} MB, ` +
      `zoom ${meta.minZoom}-${meta.maxZoom}, center ${meta.center.join(",")})`,
  );
}
