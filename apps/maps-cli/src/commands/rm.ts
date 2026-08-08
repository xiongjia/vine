import { storageConfig, loadEnv, type StorageKind } from "../lib/config";
import { deleteObject } from "../lib/storage";

export interface RmOptions {
  storage: StorageKind;
  bucket?: string;
  prefix?: string;
  dryRun?: boolean;
}

/** Delete the remote pmtiles + metadata.json. */
export async function removeRegion(region: string, opts: RmOptions): Promise<void> {
  loadEnv();
  const cfg = storageConfig(opts.storage, opts.bucket);
  const prefix = opts.prefix ?? "data/pmtiles";
  for (const f of [`${region}.pmtiles`, `${region}.metadata.json`]) {
    await deleteObject(cfg, `${prefix}/${f}`, opts.dryRun);
  }
}
