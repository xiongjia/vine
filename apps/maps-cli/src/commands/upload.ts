import { existsSync } from "node:fs";
import path from "node:path";
import {
  storageConfig,
  storageRoot,
  loadEnv,
  type StorageKind,
} from "../lib/config";
import { INDEX_FILE_NAME, readMetadata, upsertIndex } from "../lib/metadata";
import { findRepoRoot, pmtilesDir } from "../lib/repo-root";
import { uploadFile } from "../lib/storage";

export interface UploadOptions {
  storage: StorageKind;
  bucket?: string;
  /** Root dir for published assets (default: vine, or VINE_STORAGE_ROOT). */
  root?: string;
  /** Full override for the pmtiles path (wins over --root). */
  prefix?: string;
  dryRun?: boolean;
}

/** Upload `<region>.pmtiles` + `<region>.metadata.json` + `pmtiles.json` to R2/S3. */
export async function uploadRegion(
  region: string,
  opts: UploadOptions,
): Promise<void> {
  loadEnv();
  const cfg = storageConfig(opts.storage, opts.bucket);
  const dir = pmtilesDir(findRepoRoot());
  const prefix = opts.prefix ?? `${storageRoot(opts.root)}/pmtiles`;
  // validate the region files up front; pmtiles.json is created by upsertIndex
  for (const f of [`${region}.pmtiles`, `${region}.metadata.json`]) {
    if (!existsSync(path.join(dir, f))) {
      throw new Error(
        `missing ${f} in ${dir} — run "vine-maps extract ${region}" first`,
      );
    }
  }
  const meta = await readMetadata(dir, region);
  // never mutate local state on a dry-run — upsert is what creates pmtiles.json
  if (!opts.dryRun) {
    await upsertIndex(dir, meta);
  }
  for (const f of [
    `${region}.pmtiles`,
    `${region}.metadata.json`,
    INDEX_FILE_NAME,
  ]) {
    await uploadFile(cfg, path.join(dir, f), `${prefix}/${f}`, opts.dryRun);
  }
  if (!opts.dryRun) {
    console.log(
      `✓ done. Note (README): the bucket needs public read + CORS (Access-Control-Allow-Origin: *) + HTTP Range support.`,
    );
  }
}
