import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
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
  const info = await stat(localPath);
  if (dryRun) {
    console.log(`[dry-run] ${localPath} -> s3://${cfg.bucket}/${key} (${info.size} bytes)`);
    return;
  }
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
