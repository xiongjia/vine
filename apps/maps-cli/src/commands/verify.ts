import path from "node:path";
import {
  parseShowOutput,
  readMetadata,
  type RegionMetadata,
  type ShowOutput,
} from "../lib/metadata";
import { findRepoRoot, pmtilesDir } from "../lib/repo-root";
import { runPmtiles } from "../lib/run-pmtiles";

/**
 * Small tolerance for bbox/center comparisons: pmtiles may snap the archive
 * bounds to tile boundaries, so the sidecar (which stores the requested bbox)
 * can legitimately differ by a fraction of a degree.
 */
const COORD_EPSILON = 1e-3;

function fmtBox(bbox: [number, number, number, number]): string {
  return bbox.join(",");
}

/** Print `pmtiles show` metadata and cross-check the sidecar (bbox/center/zoom). */
export async function verifyRegion(region: string): Promise<void> {
  const outDir = pmtilesDir(findRepoRoot());
  const file = path.join(outDir, `${region}.pmtiles`);
  const show = runPmtiles(["show", file], { quiet: true });
  process.stdout.write(show.stdout);

  let meta: RegionMetadata;
  try {
    meta = await readMetadata(outDir, region);
  } catch {
    console.log(
      `⚠ missing ${region}.metadata.json (run extract to regenerate)`,
    );
    return;
  }

  let header: ShowOutput;
  try {
    header = parseShowOutput(show.stdout);
  } catch {
    console.log(
      "⚠ could not parse `pmtiles show` output — skipping cross-check",
    );
    return;
  }

  const [minLng, minLat, maxLng, maxLat] = meta.bbox;
  console.log(
    `✓ sidecar: bbox=${fmtBox(meta.bbox)} center=${meta.center.join(",")} ` +
      `zoom=${meta.minZoom}-${meta.maxZoom} build=${meta.buildDate} size=${(meta.sizeBytes / 1024 / 1024).toFixed(1)}MB`,
  );

  const issues: string[] = [];
  if (header.minZoom !== meta.minZoom) {
    issues.push(`min zoom: sidecar ${meta.minZoom} vs file ${header.minZoom}`);
  }
  if (header.maxZoom !== meta.maxZoom) {
    issues.push(`max zoom: sidecar ${meta.maxZoom} vs file ${header.maxZoom}`);
  }
  if (
    Math.abs(header.center[0] - meta.center[0]) > COORD_EPSILON ||
    Math.abs(header.center[1] - meta.center[1]) > COORD_EPSILON
  ) {
    issues.push(
      `center: sidecar ${meta.center.join(",")} vs file ${header.center.join(",")}`,
    );
  }
  if (
    Math.abs(header.bbox[0] - minLng) > COORD_EPSILON ||
    Math.abs(header.bbox[1] - minLat) > COORD_EPSILON ||
    Math.abs(header.bbox[2] - maxLng) > COORD_EPSILON ||
    Math.abs(header.bbox[3] - maxLat) > COORD_EPSILON
  ) {
    issues.push(
      `bbox: sidecar ${fmtBox(meta.bbox)} vs file ${fmtBox(header.bbox)}`,
    );
  }

  if (issues.length > 0) {
    console.log(
      `⚠ sidecar does not match the pmtiles header — run "vine-maps metadata ${region}" to regenerate:`,
    );
    for (const issue of issues) console.log(`  - ${issue}`);
  } else {
    console.log("✓ sidecar matches the pmtiles header");
  }
}
