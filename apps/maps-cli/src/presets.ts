/**
 * Region presets binding a region to its lng/lat bbox.
 * First two test regions: Shanghai and Tokyo; the structure leaves room for more
 * (China city-cluster bboxes in refactory-draft 0.3).
 */
export interface RegionPreset {
  name: string;
  /** minLng, minLat, maxLng, maxLat */
  bbox: [number, number, number, number];
  defaultMaxZoom: number;
  note?: string;
}

export const REGION_PRESETS: Record<string, RegionPreset> = {
  shanghai: {
    name: "shanghai",
    bbox: [120.8, 30.6, 122.2, 31.9],
    defaultMaxZoom: 15,
    note: "Shanghai metro area (~20MB)",
  },
  tokyo: {
    name: "tokyo",
    bbox: [139.4, 35.4, 140.2, 35.9],
    defaultMaxZoom: 15,
    note: "Tokyo 23 wards and surroundings (bbox to be re-verified with bboxfinder)",
  },
};

export function listRegionNames(): string[] {
  return Object.keys(REGION_PRESETS);
}

/** Resolve the bbox: prefer the --bbox arg (minLng,minLat,maxLng,maxLat), else the preset. */
export function resolveBbox(
  region: string,
  bboxArg?: string,
): [number, number, number, number] {
  if (bboxArg) {
    const parts = bboxArg.split(",").map(Number);
    if (parts.length !== 4 || parts.some(Number.isNaN)) {
      throw new Error(
        `invalid bbox: ${bboxArg} (expected minLng,minLat,maxLng,maxLat)`,
      );
    }
    return parts as [number, number, number, number];
  }
  const preset = REGION_PRESETS[region];
  if (!preset) {
    throw new Error(
      `unknown region: ${region} (available: ${listRegionNames().join(", ")}; or pass --bbox)`,
    );
  }
  return preset.bbox;
}
