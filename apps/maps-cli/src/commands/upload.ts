import { existsSync } from "node:fs";
import path from "node:path";
import { storageConfig, loadEnv, type StorageKind } from "../lib/config";
import { findRepoRoot, pmtilesDir } from "../lib/repo-root";
import { uploadFile } from "../lib/storage";

export interface UploadOptions {
  storage: StorageKind;
  bucket?: string;
  prefix?: string;
  dryRun?: boolean;
}

/** Upload `<region>.pmtiles` + `<region>.metadata.json` to R2/S3. */
export async function uploadRegion(
  region: string,
  opts: UploadOptions,
): Promise<void> {
  loadEnv();
  const cfg = storageConfig(opts.storage, opts.bucket);
  const dir = pmtilesDir(findRepoRoot());
  const prefix = opts.prefix ?? "data/pmtiles";
  for (const f of [`${region}.pmtiles`, `${region}.metadata.json`]) {
    const local = path.join(dir, f);
    if (!existsSync(local)) {
      throw new Error(
        `missing ${f} in ${dir} — run "vine-maps extract ${region}" first`,
      );
    }
    await uploadFile(cfg, local, `${prefix}/${f}`, opts.dryRun);
  }
  if (!opts.dryRun) {
    console.log(
      `✓ done. Note (README): the bucket needs public read + CORS (Access-Control-Allow-Origin: *) + HTTP Range support.`,
    );
  }
}
