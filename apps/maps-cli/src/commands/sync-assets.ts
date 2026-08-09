import { existsSync } from "node:fs";
import path from "node:path";
import {
  storageConfig,
  storageRoot,
  loadEnv,
  type StorageConfig,
  type StorageKind,
} from "../lib/config";
import { findRepoRoot, glyphsDir, pmtilesDir } from "../lib/repo-root";
import {
  deleteObject,
  getObject,
  listObjects,
  uploadDir,
} from "../lib/storage";

/** Publishable asset kinds, each mapped to one remote `vine/<kind>/` subtree. */
export const ASSET_KINDS = ["widget", "pmtiles", "glyphs"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

/**
 * Commander parser for the repeatable `--only <kind>` flag: appends the
 * comma-separated (and whitespace-trimmed) values of one flag occurrence to
 * the values collected from previous occurrences.
 */
export function collectOnlyValues(
  value: string,
  prev: string[] = [],
): string[] {
  return [
    ...prev,
    ...value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ];
}

/**
 * Resolve the `--only` list into the asset kinds to sync. An empty list means
 * all kinds; `all` is accepted as an explicit spelling of the default. Unknown
 * kinds throw so a typo cannot silently sync the wrong (or no) subset.
 */
export function parseOnlyKinds(only: string[] | undefined): AssetKind[] {
  if (!only || only.length === 0) return [...ASSET_KINDS];
  const values = only.map((raw) => raw.trim());
  // validate every value first so a typo is never silently swallowed by `all`
  const valid = new Set<string>(ASSET_KINDS);
  for (const kind of values) {
    if (kind !== "all" && !valid.has(kind)) {
      throw new Error(
        `invalid --only kind: "${kind}" (expected ${ASSET_KINDS.join(" | ")} or all)`,
      );
    }
  }
  if (values.includes("all")) return [...ASSET_KINDS];
  return [...new Set(values as AssetKind[])];
}

export interface SyncOptions {
  storage: StorageKind;
  bucket?: string;
  /** Root dir for published assets (default: vine, or VINE_STORAGE_ROOT). */
  root?: string;
  /** Full override for the base path (wins over --root). */
  prefix?: string;
  /** Asset kinds to sync (default: all). */
  only?: string[];
  dryRun?: boolean;
  /** Delete widget objects not referenced by the remote widget.json manifest. */
  pruneWidget?: boolean;
}

/**
 * Sync publishable assets to R2/S3 in one pass (publish option B):
 *   - packages/ui/dist/widget/ (hashed map-widget-* files + widget.json)
 *   - .maps-cache/pmtiles/* (incl. metadata.json + pmtiles.json)
 *   - .maps-cache/glyphs/*
 *
 * Pass `--only <kind>` to sync a single asset kind (e.g. just re-published the
 * widget bundle, or push tiles without touching glyphs). `upload <region>` is
 * the per-region pmtiles-only alternative.
 */
export async function syncAssets(opts: SyncOptions): Promise<void> {
  // validate the argument up front — a typo'd `--only` kind must surface even
  // when credentials are not configured (or are wrong), not be masked by the
  // storage config error.
  const kinds = parseOnlyKinds(opts.only);
  loadEnv();
  const cfg = storageConfig(opts.storage, opts.bucket);
  const repoRoot = findRepoRoot();
  const prefix = opts.prefix ?? storageRoot(opts.root);

  const widgetDir = path.join(repoRoot, "packages/ui/dist/widget");
  const pmDir = pmtilesDir(repoRoot);
  const glDir = glyphsDir(repoRoot);

  // Sync what exists; warn + skip the rest (with a summary) instead of failing
  // the whole publish over one missing step. The remote path is always
  // `<prefix>/<kind>/`, so the directory name is derived from the kind rather
  // than stored.
  const allTargets: Array<{ kind: AssetKind; dir: string; label: string }> = [
    { kind: "widget", dir: widgetDir, label: "widget bundle" },
    { kind: "pmtiles", dir: pmDir, label: "pmtiles" },
    { kind: "glyphs", dir: glDir, label: "glyphs" },
  ];
  const targets = allTargets.filter((t) => kinds.includes(t.kind));

  const skipped: string[] = [];
  const synced: string[] = [];
  for (const { kind, dir, label } of targets) {
    if (!existsSync(dir)) {
      skipped.push(label);
      console.log(
        `⚠ skipping ${label}: not found at ${dir} — run "pnpm --filter=@vine/ui build:widget" / "vine-maps extract <region>" / the glyph warm-up step first`,
      );
      continue;
    }
    await uploadDir(cfg, dir, `${prefix}/${kind}`, opts.dryRun);
    synced.push(label);
  }
  if (skipped.length > 0) {
    // keep the original shape, but name what DID sync when only part of the
    // requested set was skipped
    const syncedNote =
      synced.length > 0 ? ` (synced: ${synced.join(", ")})` : "";
    console.log(
      `⚠ done — skipped assets: ${skipped.join(", ")}${syncedNote} (re-run after producing them)`,
    );
  } else if (synced.length > 0 && !opts.dryRun) {
    console.log(
      `✓ ${synced.length === ASSET_KINDS.length ? "all assets" : synced.join(", ")} synced to s3://${cfg.bucket}/${prefix}/`,
    );
  }

  if (opts.pruneWidget) {
    await pruneWidget(cfg, prefix, opts.dryRun ?? false);
  }
}

/** Basename of a storage key (everything after the last `/`). */
const basename = (key: string): string => key.slice(key.lastIndexOf("/") + 1);

export interface WidgetPrunePlan {
  /** Bare filenames that must be kept (manifest entry/css/files + widget.json). */
  keep: Set<string>;
  /** Full keys (prefix included) that are safe to delete. */
  orphans: string[];
}

/**
 * Compute which remote widget objects are orphans: anything not referenced by
 * the published widget.json manifest (entry, css and the files[] list) plus
 * the manifest itself. Without a valid manifest nothing is known-live, so
 * every key is kept — a missing or unparseable manifest must never trigger
 * deletions.
 */
export function computeWidgetPrune(
  manifestRaw: string | null,
  keys: string[],
): WidgetPrunePlan {
  if (manifestRaw === null) {
    return { keep: new Set(keys.map(basename)), orphans: [] };
  }
  let manifest: {
    entry?: string;
    css?: string;
    files?: Array<{ name: string }>;
  };
  try {
    manifest = JSON.parse(manifestRaw);
  } catch {
    return { keep: new Set(keys.map(basename)), orphans: [] };
  }
  const keep = new Set<string>([
    "widget.json",
    ...(manifest.entry ? [manifest.entry] : []),
    ...(manifest.css ? [manifest.css] : []),
    ...(manifest.files ?? []).map((f) => f.name),
  ]);
  return { keep, orphans: keys.filter((k) => !keep.has(basename(k))) };
}

/**
 * Delete remote widget objects no longer referenced by the published
 * widget.json. Runs after the sync loop so the freshly uploaded manifest is
 * authoritative. A missing manifest aborts the prune (nothing is known-live).
 */
async function pruneWidget(
  cfg: StorageConfig,
  prefix: string,
  dryRun: boolean,
): Promise<void> {
  const widgetPrefix = `${prefix}/widget/`;
  const keys = await listObjects(cfg, widgetPrefix);
  if (keys.length === 0) {
    console.log(`⚠ ${widgetPrefix} has no objects — nothing to prune`);
    return;
  }
  const manifestKey = `${widgetPrefix}widget.json`;
  const manifestRaw = await getObject(cfg, manifestKey);
  if (manifestRaw === null) {
    console.log(
      `⚠ no widget.json manifest at ${manifestKey} — skipping prune (nothing is known-live)`,
    );
    return;
  }
  const { orphans } = computeWidgetPrune(manifestRaw, keys);
  if (orphans.length === 0) {
    console.log(
      `✓ no orphaned widget files (${keys.length} objects, all referenced)`,
    );
    return;
  }
  console.log(
    `pruning ${orphans.length} orphaned widget file(s), keeping ${keys.length - orphans.length}`,
  );
  for (const key of orphans) {
    await deleteObject(cfg, key, dryRun);
  }
  console.log(
    dryRun
      ? `[dry-run] ${orphans.length} file(s) would be deleted — re-run without --dry-run to prune`
      : `✓ pruned ${orphans.length} orphaned widget file(s)`,
  );
}
