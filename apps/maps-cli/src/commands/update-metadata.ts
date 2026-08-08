import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  INDEX_FILE_NAME,
  buildMetadata,
  parseShowOutput,
  rebuildIndex,
  readMetadata,
  scanIndex,
  writeMetadata,
} from "../lib/metadata";
import { findRepoRoot } from "../lib/repo-root";
import { installHint, pmtilesAvailable, pmtilesBin } from "../lib/run-pmtiles";

export interface UpdateMetadataOptions {
  dir?: string;
  dryRun?: boolean;
}

/**
 * Run `pmtiles show` without exiting the process (unlike `runPmtiles`), so a
 * single unreadable file can be skipped instead of aborting the whole run.
 * Returns null when the command fails.
 */
function showPmtiles(file: string): string | null {
  const res = spawnSync(pmtilesBin(), ["show", file], { encoding: "utf8" });
  if (res.error || res.status !== 0) return null;
  return res.stdout ?? "";
}

/**
 * Regenerate `<region>.metadata.json` for every `*.pmtiles` in a directory
 * (default: the repo root) and rebuild the aggregate `pmtiles.json` index.
 * Works for arbitrary pmtiles files — no preset needed, so a user can drop
 * any set of files in a dir and get all metadata in one pass.
 *
 * Relative `dir` values resolve against the repo root, not the process cwd:
 * `pnpm --filter` (and turbo) run with cwd = the package dir, so a user typing
 * `update-metadata .maps-cache/pmtiles` from the repo root means the repo-root
 * path — `findRepoRoot` walks up from the package dir to find it.
 */
export async function updateMetadataInDir(
  opts: UpdateMetadataOptions,
): Promise<void> {
  // Absolute paths work from anywhere; relative ones resolve against the repo
  // root (`pnpm --filter` runs with cwd = the package dir). `path.resolve`
  // would return an absolute `dir` unchanged, but `findRepoRoot` must not run
  // for standalone absolute-dir usage outside the repo.
  const base = opts.dir ?? ".";
  const dir = path.isAbsolute(base) ? base : path.resolve(findRepoRoot(), base);
  const dryRun = opts.dryRun ?? false;
  if (!pmtilesAvailable()) {
    installHint();
    process.exit(1);
  }
  if (!existsSync(dir)) {
    throw new Error(`directory not found: ${dir}`);
  }
  const tiles = (await readdir(dir))
    .filter((f) => f.endsWith(".pmtiles"))
    .sort();
  if (tiles.length === 0) {
    console.log(`(no .pmtiles files in ${dir})`);
    return;
  }

  let updated = 0;
  for (const tile of tiles) {
    const region = path.basename(tile, ".pmtiles");
    const file = path.join(dir, tile);
    const showText = showPmtiles(file);
    if (showText === null) {
      console.log(`⚠ ${tile}: pmtiles show failed — skipping`);
      continue;
    }
    let buildDate = "local";
    try {
      const prev = await readMetadata(dir, region);
      buildDate = prev.buildDate;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === undefined) {
        // corrupt sidecar — regenerate from the header, nothing worth preserving
        console.log(
          `⚠ ${tile}: previous sidecar is corrupt — ${
            dryRun ? "would be regenerated" : "regenerating it"
          } (buildDate defaults to local)`,
        );
      } else if (code !== "ENOENT") {
        throw err; // permission or other fs-level error — surface it
      }
      // missing (ENOENT) or corrupt — keep "local"
    }
    try {
      const header = parseShowOutput(showText);
      const meta = await buildMetadata({
        name: region,
        bbox: header.bbox,
        buildDate,
        file,
        showText,
      });
      updated++;
      if (dryRun) {
        console.log(
          `[dry-run] ${region}.metadata.json: bbox=${meta.bbox.join(",")} center=${meta.center.join(",")} zoom=${meta.minZoom}-${meta.maxZoom} build=${buildDate}`,
        );
      } else {
        await writeMetadata(meta, dir);
      }
    } catch (err) {
      console.log(
        `⚠ ${tile}: ${err instanceof Error ? err.message : String(err)} — skipping`,
      );
    }
  }

  // scanIndex is a pure read — safe to run for the dry-run summary
  const index = dryRun ? await scanIndex(dir) : await rebuildIndex(dir);
  console.log(
    `${dryRun ? "[dry-run]" : "✓"} ${updated}/${tiles.length} sidecar(s) ${
      dryRun ? "would be updated" : "updated"
    } in ${dir}`,
  );
  console.log(
    `${dryRun ? "[dry-run]" : "✓"} ${INDEX_FILE_NAME}: ${index.regions.length} region(s) catalogued`,
  );
}
