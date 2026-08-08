import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import {
  storageConfig,
  storageRoot,
  loadEnv,
  type StorageKind,
} from "../lib/config";
import {
  INDEX_FILE_NAME,
  type PmtilesIndex,
  emptyIndex,
  indexPath,
  parseIndex,
  persistIndex,
  readIndex,
  scanIndex,
  withoutRegion,
} from "../lib/metadata";
import { findRepoRoot, pmtilesDir } from "../lib/repo-root";
import { deleteObject, getObject, uploadFile } from "../lib/storage";

export interface RmOptions {
  storage: StorageKind;
  bucket?: string;
  /** Root dir for published assets (default: vine, or VINE_STORAGE_ROOT). */
  root?: string;
  /** Full override for the pmtiles path (wins over --root). */
  prefix?: string;
  dryRun?: boolean;
}

/**
 * Local index: read the file, or build it from the sidecars — an empty catalog
 * when the cache dir is missing entirely (rm may run without a local cache).
 */
async function readLocalIndex(dir: string): Promise<PmtilesIndex> {
  if (existsSync(indexPath(dir))) return readIndex(dir);
  if (!existsSync(dir)) return emptyIndex();
  return scanIndex(dir);
}

/**
 * Delete the remote pmtiles + metadata.json and drop the region from
 * `pmtiles.json`. The published (remote) index is authoritative: it is fetched,
 * filtered and re-uploaded, and the local index is updated to match. Falls back
 * to the local index when no remote index exists yet.
 */
export async function removeRegion(
  region: string,
  opts: RmOptions,
): Promise<void> {
  loadEnv();
  const cfg = storageConfig(opts.storage, opts.bucket);
  const dir = pmtilesDir(findRepoRoot());
  const prefix = opts.prefix ?? `${storageRoot(opts.root)}/pmtiles`;
  const indexKey = `${prefix}/${INDEX_FILE_NAME}`;

  // Read + validate the published index BEFORE deleting anything, so a read or
  // parse failure leaves the remote untouched instead of deleting tiles while
  // the catalog still lists them.
  let index: PmtilesIndex;
  try {
    const remoteRaw = await getObject(cfg, indexKey);
    index =
      remoteRaw !== null ? parseIndex(remoteRaw) : await readLocalIndex(dir);
  } catch (err) {
    if (opts.dryRun) {
      // a dry-run is a preview — don't fail just because the remote is unreachable
      const msg = err instanceof Error ? err.message : String(err);
      console.log(
        `⚠ could not read remote ${INDEX_FILE_NAME} (${msg}) — previewing from local state`,
      );
      index = await readLocalIndex(dir);
    } else {
      throw err;
    }
  }

  const next = withoutRegion(index, region);
  if (opts.dryRun) {
    for (const f of [`${region}.pmtiles`, `${region}.metadata.json`]) {
      await deleteObject(cfg, `${prefix}/${f}`, true);
    }
    console.log(
      `[dry-run] ${INDEX_FILE_NAME}: ${index.regions.length} → ${next.regions.length} region(s)`,
    );
    await uploadFile(cfg, indexPath(dir), indexKey, true);
    return;
  }

  for (const f of [`${region}.pmtiles`, `${region}.metadata.json`]) {
    await deleteObject(cfg, `${prefix}/${f}`, false);
  }
  await mkdir(dir, { recursive: true });
  await persistIndex(dir, next);
  await uploadFile(cfg, indexPath(dir), indexKey, false);
  console.log(
    `✓ ${INDEX_FILE_NAME} updated (${next.regions.length} region(s) remain catalogued)`,
  );
}
