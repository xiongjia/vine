import { readdir } from "node:fs/promises";
import path from "node:path";
import { readMetadata } from "../lib/metadata";
import { findRepoRoot, pmtilesDir } from "../lib/repo-root";

/** List the regions under the local .maps-cache/pmtiles/ with their sidecar summary. */
export async function listRegions(): Promise<void> {
  const dir = pmtilesDir(findRepoRoot());
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    console.log("(directory missing — run extract first)");
    return;
  }
  const regions = files.filter((f) => f.endsWith(".pmtiles")).sort();
  if (regions.length === 0) {
    console.log("(no pmtiles yet — run extract <region> first)");
    return;
  }
  for (const f of regions) {
    const region = path.basename(f, ".pmtiles");
    try {
      const m = await readMetadata(dir, region);
      console.log(
        `${region.padEnd(10)} ${(m.sizeBytes / 1024 / 1024).toFixed(1).padStart(6)}MB  ` +
          `bbox ${m.bbox.join(",")}  center ${m.center.join(",")}  z${m.minZoom}-${m.maxZoom}  build ${m.buildDate}`,
      );
    } catch (err) {
      const reason =
        (err as NodeJS.ErrnoException).code === "ENOENT"
          ? "no sidecar — run extract to regenerate"
          : "corrupt sidecar — run update-metadata";
      console.log(`${region.padEnd(10)} ?  (${reason})`);
    }
  }
}
