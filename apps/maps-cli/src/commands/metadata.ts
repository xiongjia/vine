import path from "node:path";
import { buildMetadata, writeMetadata } from "../lib/metadata";
import { findRepoRoot, pmtilesDir } from "../lib/repo-root";
import { runPmtiles } from "../lib/run-pmtiles";
import { resolveBbox } from "../presets";

export interface MetadataOptions {
  build?: string;
  bbox?: string;
}

/** Generate/refresh `<region>.metadata.json` for an existing `<region>.pmtiles`. */
export async function generateMetadata(region: string, opts: MetadataOptions): Promise<void> {
  const dir = pmtilesDir(findRepoRoot());
  const file = path.join(dir, `${region}.pmtiles`);
  const bbox = resolveBbox(region, opts.bbox);
  const show = runPmtiles(["show", file], { quiet: true });
  const meta = await buildMetadata({
    name: region,
    bbox,
    buildDate: opts.build ?? "local",
    file,
    showText: show.stdout,
  });
  await writeMetadata(meta, dir);
  console.log(
    `✓ ${region}.metadata.json (bbox=${meta.bbox.join(",")} center=${meta.center.join(",")} ` +
      `zoom=${meta.minZoom}-${meta.maxZoom} build=${meta.buildDate} size=${(meta.sizeBytes / 1024 / 1024).toFixed(1)}MB)`,
  );
}
