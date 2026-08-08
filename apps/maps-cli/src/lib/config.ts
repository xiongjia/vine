import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { findRepoRoot } from "./repo-root";

export type StorageKind = "r2" | "s3";

export interface StorageConfig {
  storage: StorageKind;
  /** Required for R2 (S3-compatible endpoint); not needed for AWS S3. */
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/** Load `.env` / `.env.local` from the repo root (tsx does not load .env files). */
export function loadEnv(): void {
  const root = findRepoRoot();
  loadDotenv({ path: path.join(root, ".env") });
  loadDotenv({ path: path.join(root, ".env.local") });
}

/** R2/S3 credentials come from env vars: VINE_R2_* or VINE_S3_*. */
export function storageConfig(
  storage: StorageKind,
  bucket?: string,
): StorageConfig {
  const prefix = storage === "r2" ? "VINE_R2" : "VINE_S3";
  const cfg: StorageConfig = {
    storage,
    endpoint: process.env[`${prefix}_ENDPOINT`],
    region:
      process.env[`${prefix}_REGION`] ??
      (storage === "r2" ? "auto" : "us-east-1"),
    accessKeyId: process.env[`${prefix}_ACCESS_KEY`] ?? "",
    secretAccessKey: process.env[`${prefix}_SECRET_KEY`] ?? "",
    bucket: bucket ?? process.env[`${prefix}_BUCKET`] ?? "",
  };
  if (storage === "r2" && !cfg.endpoint) {
    throw new Error(
      `missing object storage config: ${prefix}_ENDPOINT is required for R2 ` +
        "(S3-compatible endpoint)",
    );
  }
  if (!cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucket) {
    throw new Error(
      `missing object storage config: ${prefix}_ACCESS_KEY / ${prefix}_SECRET_KEY / ${prefix}_BUCKET` +
        " (pass --bucket to override)",
    );
  }
  return cfg;
}

/**
 * Root directory for published assets (`<bucket>/<root>/widget|pmtiles|glyphs`).
 * The `--root` flag wins, then env `VINE_STORAGE_ROOT`, default `"vine"`;
 * `--prefix` overrides the full path. Rejects empty / leading-slash roots.
 */
export function storageRoot(rootOverride?: string): string {
  const root = rootOverride ?? process.env.VINE_STORAGE_ROOT ?? "vine";
  if (root.trim() === "" || root.startsWith("/")) {
    throw new Error(
      `invalid storage root: "${root}" (expected non-empty, no leading slash)`,
    );
  }
  return root;
}
