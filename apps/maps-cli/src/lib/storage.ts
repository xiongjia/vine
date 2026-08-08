import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { StorageConfig } from "./config";

function makeS3(cfg: StorageConfig): S3Client {
  return new S3Client({
    region: cfg.region,
    ...(cfg.endpoint ? { endpoint: cfg.endpoint } : {}),
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
}

export async function uploadFile(
  cfg: StorageConfig,
  localPath: string,
  key: string,
  dryRun = false,
): Promise<void> {
  if (dryRun) {
    // preview only — tolerate files that don't exist yet (e.g. pmtiles.json
    // is created by the same command right before the upload loop)
    let size = "";
    try {
      size = ` (${(await stat(localPath)).size} bytes)`;
    } catch {
      // missing in a dry-run is fine
    }
    console.log(`[dry-run] ${localPath} -> s3://${cfg.bucket}/${key}${size}`);
    return;
  }
  const info = await stat(localPath);
  const s3 = makeS3(cfg);
  await s3.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: createReadStream(localPath),
      ContentType: key.endsWith(".json") ? "application/json" : "application/octet-stream",
    }),
  );
  console.log(`✓ ${key} (${info.size} bytes)`);
}

export async function deleteObject(cfg: StorageConfig, key: string, dryRun = false): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] delete s3://${cfg.bucket}/${key}`);
    return;
  }
  const s3 = makeS3(cfg);
  await s3.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
  console.log(`✗ ${key} deleted`);
}

/** Drain a node `Readable` stream into a UTF-8 string. */
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Fetch an object's text content; returns null when the key does not exist.
 * (Node-only: `Body` is always a node `Readable` here, see the
 * `StreamingBlobTypes` union which also covers browser builds.)
 */
export async function getObject(
  cfg: StorageConfig,
  key: string,
): Promise<string | null> {
  const s3 = makeS3(cfg);
  try {
    const out = await s3.send(
      new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
    );
    if (!out.Body) return null;
    return await streamToString(out.Body as Readable);
  } catch (err) {
    if ((err as { name?: string }).name === "NoSuchKey") return null;
    throw err;
  }
}

/** Recursively upload every file in a directory (relative paths kept, prefix prepended). */
export async function uploadDir(
  cfg: StorageConfig,
  localDir: string,
  prefix: string,
  dryRun = false,
): Promise<void> {
  const entries = await readdir(localDir, { withFileTypes: true });
  for (const entry of entries) {
    const localPath = path.join(localDir, entry.name);
    if (entry.isDirectory()) {
      await uploadDir(cfg, localPath, `${prefix}/${entry.name}`, dryRun);
    } else {
      await uploadFile(cfg, localPath, `${prefix}/${entry.name}`, dryRun);
    }
  }
}

export async function listObjects(cfg: StorageConfig, prefix: string): Promise<string[]> {
  const s3 = makeS3(cfg);
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const out = await s3.send(
      new ListObjectsV2Command({ Bucket: cfg.bucket, Prefix: prefix, ContinuationToken: token }),
    );
    for (const o of out.Contents ?? []) if (o.Key) keys.push(o.Key);
    token = out.NextContinuationToken;
  } while (token);
  return keys;
}
