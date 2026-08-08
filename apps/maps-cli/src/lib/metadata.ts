import { existsSync } from "node:fs";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * `<region>.metadata.json` sidecar: JSON metadata next to the pmtiles file, so
 * demo/playground/widget can know the lng/lat bounds without parsing the pmtiles binary.
 */
export interface RegionMetadata {
  name: string;
  /** minLng, minLat, maxLng, maxLat */
  bbox: [number, number, number, number];
  center: [number, number];
  minZoom: number;
  maxZoom: number;
  /** Protomaps build date YYYYMMDD */
  buildDate: string;
  sizeBytes: number;
  file: string;
}

/** Parsed `pmtiles show` header fields (bounds / min-max zoom / center). */
export interface ShowOutput {
  bbox: [number, number, number, number];
  center: [number, number];
  minZoom: number;
  maxZoom: number;
}

/**
 * Parse the plain-text `pmtiles show` output (bounds / min-max zoom / center).
 * Throws when a required field is missing.
 */
export function parseShowOutput(showText: string): ShowOutput {
  const m = {
    bounds:
      /^bounds: \(long: ([\d.-]+), lat: ([\d.-]+)\) \(long: ([\d.-]+), lat: ([\d.-]+)\)$/m.exec(
        showText,
      ),
    minZoom: /^min zoom: (\d+)$/m.exec(showText),
    maxZoom: /^max zoom: (\d+)$/m.exec(showText),
    center: /^center: \(long: ([\d.-]+), lat: ([\d.-]+)\)$/m.exec(showText),
  };
  if (!m.bounds || !m.minZoom || !m.maxZoom || !m.center) {
    throw new Error(
      `pmtiles show output missing bounds/zoom/center:\n${showText.slice(0, 300)}`,
    );
  }
  return {
    bbox: [
      Number(m.bounds[1]),
      Number(m.bounds[2]),
      Number(m.bounds[3]),
      Number(m.bounds[4]),
    ],
    center: [Number(m.center[1]), Number(m.center[2])],
    minZoom: Number(m.minZoom[1]),
    maxZoom: Number(m.maxZoom[1]),
  };
}

export function metadataPath(pmtilesDir: string, region: string): string {
  return path.join(pmtilesDir, `${region}.metadata.json`);
}

export function writeMetadata(
  meta: RegionMetadata,
  dir: string,
): Promise<void> {
  return writeFile(
    metadataPath(dir, meta.name),
    JSON.stringify(meta, null, 2) + "\n",
    "utf8",
  );
}

export async function readMetadata(
  dir: string,
  region: string,
): Promise<RegionMetadata> {
  const raw = await readFile(metadataPath(dir, region), "utf8");
  let parsed: RegionMetadata | null;
  try {
    parsed = JSON.parse(raw) as RegionMetadata | null;
  } catch (err) {
    throw new Error(
      `invalid metadata sidecar ${region}.metadata.json: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    typeof parsed.name !== "string" ||
    typeof parsed.file !== "string"
  ) {
    throw new Error(
      `invalid metadata sidecar ${region}.metadata.json: expected a region metadata object`,
    );
  }
  return parsed;
}

export const INDEX_FILE_NAME = "pmtiles.json";

/**
 * Aggregate catalog: one JSON file listing every region's metadata together
 * with its `.pmtiles` file, so consumers can discover all regions from a
 * single request instead of knowing every filename in advance.
 */
export interface PmtilesIndex {
  version: 1;
  updatedAt: string;
  regions: RegionMetadata[];
}

export function indexPath(dir: string): string {
  return path.join(dir, INDEX_FILE_NAME);
}

export function emptyIndex(): PmtilesIndex {
  return { version: 1, updatedAt: new Date().toISOString(), regions: [] };
}

/**
 * Validate + parse the raw index JSON. Version mismatches throw a coded error
 * (`ERR_INDEX_VERSION`) so callers can distinguish "don't touch this" from
 * plain corruption.
 */
export function parseIndex(raw: string): PmtilesIndex {
  const parsed = JSON.parse(raw) as PmtilesIndex | null;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`invalid ${INDEX_FILE_NAME}: expected a JSON object`);
  }
  if (parsed.version !== 1) {
    const err = new Error(
      `unsupported ${INDEX_FILE_NAME} version: ${JSON.stringify(parsed.version)}`,
    ) as NodeJS.ErrnoException;
    err.code = "ERR_INDEX_VERSION";
    throw err;
  }
  if (
    !Array.isArray(parsed.regions) ||
    parsed.regions.some(
      (r) => typeof r?.name !== "string" || typeof r?.file !== "string",
    )
  ) {
    throw new Error(
      `invalid ${INDEX_FILE_NAME}: expected { version: 1, regions: [{ name, file, ... }] }`,
    );
  }
  return parsed;
}

/**
 * Read the aggregate index. A missing file counts as an empty catalog; a
 * corrupt one is self-healed by rebuilding it from the sidecars.
 */
export async function readIndex(dir: string): Promise<PmtilesIndex> {
  try {
    return parseIndex(await readFile(indexPath(dir), "utf8"));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return emptyIndex();
    if (code !== undefined) throw err; // fs-level error or unsupported version — surface it
    console.log(
      `⚠ ${INDEX_FILE_NAME} is corrupt — rebuilding it from sidecars`,
    );
    return scanIndex(dir);
  }
}

/** Persist an index to disk (sorted by region name, fresh `updatedAt`). */
export async function persistIndex(
  dir: string,
  index: PmtilesIndex,
): Promise<PmtilesIndex> {
  const next: PmtilesIndex = {
    ...index,
    updatedAt: new Date().toISOString(),
    regions: [...index.regions].sort((a, b) => a.name.localeCompare(b.name)),
  };
  await writeFile(indexPath(dir), JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}

/** Add or replace one region in the aggregate index and persist it. */
export async function upsertIndex(
  dir: string,
  meta: RegionMetadata,
): Promise<PmtilesIndex> {
  const index = await readIndex(dir);
  return persistIndex(dir, {
    ...index,
    regions: [...index.regions.filter((r) => r.name !== meta.name), meta],
  });
}

/** Return a copy of the index without the given region. */
export function withoutRegion(
  index: PmtilesIndex,
  region: string,
): PmtilesIndex {
  return {
    ...index,
    regions: index.regions.filter((r) => r.name !== region),
  };
}

/** Remove one region from the aggregate index and persist it. */
export async function removeFromIndex(
  dir: string,
  region: string,
): Promise<PmtilesIndex> {
  const index = await readIndex(dir);
  return persistIndex(dir, withoutRegion(index, region));
}

/**
 * Scan the `<region>.metadata.json` sidecars on disk into an index (without
 * writing), keeping only entries whose `<region>.pmtiles` file exists. Corrupt
 * sidecars are skipped with a warning so a directory scan always completes.
 */
export async function scanIndex(dir: string): Promise<PmtilesIndex> {
  const entries = await readdir(dir, { withFileTypes: true });
  const regions: RegionMetadata[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".metadata.json")) continue;
    const region = path.basename(entry.name, ".metadata.json");
    if (!existsSync(path.join(dir, `${region}.pmtiles`))) continue;
    const raw = await readFile(path.join(dir, entry.name), "utf8");
    let parsed: RegionMetadata | null;
    try {
      parsed = JSON.parse(raw) as RegionMetadata | null;
    } catch (err) {
      console.log(
        `⚠ skipping corrupt sidecar ${entry.name}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      continue;
    }
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      typeof parsed.name !== "string" ||
      typeof parsed.file !== "string"
    ) {
      console.log(
        `⚠ skipping invalid sidecar ${entry.name}: not a region metadata object`,
      );
      continue;
    }
    regions.push(parsed);
  }
  return { version: 1, updatedAt: new Date().toISOString(), regions };
}

/** Rebuild the aggregate index from the sidecars on disk and persist it. */
export async function rebuildIndex(dir: string): Promise<PmtilesIndex> {
  return persistIndex(dir, await scanIndex(dir));
}

export async function buildMetadata(input: {
  name: string;
  bbox: [number, number, number, number];
  buildDate: string;
  file: string;
  /** Text output of `pmtiles show <file>` (bounds / min-max zoom / center) */
  showText: string;
}): Promise<RegionMetadata> {
  const parsed = parseShowOutput(input.showText);
  const sizeBytes = (await stat(input.file)).size;
  return {
    name: input.name,
    bbox: input.bbox,
    center: parsed.center,
    minZoom: parsed.minZoom,
    maxZoom: parsed.maxZoom,
    buildDate: input.buildDate,
    sizeBytes,
    file: path.basename(input.file),
  };
}
