import { readFile, stat, writeFile } from "node:fs/promises";
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
  return JSON.parse(raw) as RegionMetadata;
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
