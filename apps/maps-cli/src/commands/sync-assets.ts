import { existsSync } from "node:fs";
import path from "node:path";
import { storageConfig, loadEnv, type StorageKind } from "../lib/config";
import { findRepoRoot, glyphsDir, pmtilesDir } from "../lib/repo-root";
import { uploadDir } from "../lib/storage";

export interface SyncOptions {
  storage: StorageKind;
  bucket?: string;
  prefix?: string;
  dryRun?: boolean;
}

/**
 * Sync all publishable assets in one pass (publish option B):
 *   - packages/ui/dist/widget/（map-widget.js + css）
 *   - .maps-cache/pmtiles/* (incl. metadata.json)
 *   - .maps-cache/glyphs/*
 */
export async function syncAssets(opts: SyncOptions): Promise<void> {
  loadEnv();
  const cfg = storageConfig(opts.storage, opts.bucket);
  const repoRoot = findRepoRoot();
  const prefix = opts.prefix ?? "data";

  const widgetDir = path.join(repoRoot, "packages/ui/dist/widget");
  const pmDir = pmtilesDir(repoRoot);
  const glDir = glyphsDir(repoRoot);

  // Sync what exists; warn + skip the rest (with a summary) instead of failing
  // the whole publish over one missing step.
  const targets: Array<{ dir: string; sub: string; label: string }> = [
    { dir: widgetDir, sub: "widget", label: "widget bundle" },
    { dir: pmDir, sub: "pmtiles", label: "pmtiles" },
    { dir: glDir, sub: "glyphs", label: "glyphs" },
  ];
  const skipped: string[] = [];
  for (const { dir, sub, label } of targets) {
    if (!existsSync(dir)) {
      skipped.push(label);
      console.log(
        `⚠ skipping ${label}: not found at ${dir} — run "pnpm --filter=@vine/ui build:widget" / "vine-maps extract <region>" / the glyph warm-up step first`,
      );
      continue;
    }
    await uploadDir(cfg, dir, `${prefix}/${sub}`, opts.dryRun);
  }
  if (skipped.length > 0) {
    console.log(
      `⚠ done — skipped assets: ${skipped.join(", ")} (re-run after producing them)`,
    );
  } else if (!opts.dryRun) {
    console.log(`✓ all assets synced to s3://${cfg.bucket}/${prefix}/`);
  }
}
