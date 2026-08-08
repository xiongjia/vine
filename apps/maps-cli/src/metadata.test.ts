import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  INDEX_FILE_NAME,
  type PmtilesIndex,
  buildMetadata,
  indexPath,
  metadataPath,
  parseIndex,
  readIndex,
  readMetadata,
  rebuildIndex,
  removeFromIndex,
  scanIndex,
  upsertIndex,
  withoutRegion,
  writeMetadata,
} from "./lib/metadata";

const shanghai = {
  name: "shanghai",
  bbox: [120.8, 30.6, 122.2, 31.9] as [number, number, number, number],
  center: [121.5, 31.2] as [number, number],
  minZoom: 0,
  maxZoom: 15,
  buildDate: "20260805",
  sizeBytes: 21000000,
  file: "shanghai.pmtiles",
};

const tokyo = {
  name: "tokyo",
  bbox: [139.4, 35.4, 140.2, 35.9] as [number, number, number, number],
  center: [139.8, 35.65] as [number, number],
  minZoom: 0,
  maxZoom: 15,
  buildDate: "20260805",
  sizeBytes: 11000000,
  file: "tokyo.pmtiles",
};

describe("metadata sidecar", () => {
  it("writeMetadata / readMetadata round-trip", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      await writeMetadata(shanghai, dir);
      const back = await readMetadata(dir, "shanghai");
      expect(back).toEqual(shanghai);
      const raw = await readFile(metadataPath(dir, "shanghai"), "utf8");
      expect(JSON.parse(raw)).toEqual(shanghai);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("buildMetadata parses `pmtiles show` plain-text output", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      const file = path.join(dir, "shanghai.pmtiles");
      // write a placeholder file just for sizeBytes
      await writeFile(file, "x".repeat(100));
      const showText = [
        "pmtiles spec version: 3",
        "tile type: mvt",
        "bounds: (long: 120.800000, lat: 30.600000) (long: 122.200000, lat: 31.900000)",
        "min zoom: 0",
        "max zoom: 15",
        "center: (long: 121.500000, lat: 31.200000)",
        "tile entries count: 128",
      ].join("\n");
      const meta = await buildMetadata({
        name: "shanghai",
        bbox: [120.8, 30.6, 122.2, 31.9],
        buildDate: "20260805",
        file,
        showText,
      });
      expect(meta.minZoom).toBe(0);
      expect(meta.maxZoom).toBe(15);
      expect(meta.center).toEqual([121.5, 31.2]);
      expect(meta.sizeBytes).toBe(100);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("buildMetadata rejects show output without bounds", async () => {
    await expect(
      buildMetadata({
        name: "x",
        bbox: [1, 2, 3, 4],
        buildDate: "20260805",
        file: "x.pmtiles",
        showText: "min zoom: 0\nmax zoom: 15",
      }),
    ).rejects.toThrow(/bounds/);
  });

  it("readIndex returns an empty catalog when the index file is missing", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      expect((await readIndex(dir)).regions).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("upsertIndex adds regions and replaces on re-upsert", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      const first = await upsertIndex(dir, shanghai);
      expect(first.regions).toEqual([shanghai]);

      const second = await upsertIndex(dir, tokyo);
      expect(second.regions.map((r) => r.name)).toEqual(["shanghai", "tokyo"]);

      // Re-upserting a region replaces its entry in place
      const replaced = await upsertIndex(dir, { ...shanghai, sizeBytes: 999 });
      expect(replaced.regions).toHaveLength(2);
      expect(
        replaced.regions.find((r) => r.name === "shanghai")?.sizeBytes,
      ).toBe(999);

      const raw = await readFile(indexPath(dir), "utf8");
      const parsed = JSON.parse(raw);
      expect(parsed.version).toBe(1);
      expect(parsed.regions).toHaveLength(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("removeFromIndex drops a region and is a no-op on missing index", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      await upsertIndex(dir, shanghai);
      await upsertIndex(dir, tokyo);
      const after = await removeFromIndex(dir, "tokyo");
      expect(after.regions.map((r) => r.name)).toEqual(["shanghai"]);

      // removing an unknown region is safe
      const again = await removeFromIndex(dir, "nope");
      expect(again.regions).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rebuildIndex scans sidecars and skips entries without a pmtiles file", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      await writeMetadata(shanghai, dir);
      await writeMetadata(tokyo, dir);
      // only shanghai has a matching .pmtiles on disk
      await writeFile(path.join(dir, "shanghai.pmtiles"), "x");
      const index = await rebuildIndex(dir);
      expect(index.regions.map((r) => r.name)).toEqual(["shanghai"]);
      expect(await readIndex(dir)).toEqual(index);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("index file name is pmtiles.json next to the sidecars", () => {
    const dir = path.join(os.tmpdir(), "maps-cli-index");
    expect(INDEX_FILE_NAME).toBe("pmtiles.json");
    expect(indexPath(dir)).toBe(path.join(dir, "pmtiles.json"));
    expect(metadataPath(dir, "shanghai")).toBe(
      path.join(dir, "shanghai.metadata.json"),
    );
  });

  it("parseIndex rejects a malformed index", () => {
    expect(() => parseIndex("[]")).toThrow(/invalid/);
    expect(() => parseIndex("null")).toThrow(/invalid/);
    // region entries must at least carry name + file
    expect(() => parseIndex('{"version":1,"regions":[{"foo":1}]}')).toThrow(
      /invalid/,
    );
    // an unsupported version is a coded error, not plain corruption
    expect(() => parseIndex('{"version":2,"regions":[]}')).toThrow(
      /unsupported/,
    );
    expect(parseIndex('{"version":1,"regions":[]}').regions).toEqual([]);
  });

  it("readIndex does not self-heal an unsupported index version", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      await writeMetadata(shanghai, dir);
      await writeFile(path.join(dir, "shanghai.pmtiles"), "x");
      await writeFile(indexPath(dir), '{"version":2,"regions":[]}');
      await expect(readIndex(dir)).rejects.toThrow(/unsupported/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("readIndex self-heals a corrupt index file from the sidecars", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      await writeMetadata(shanghai, dir);
      await writeMetadata(tokyo, dir);
      await writeFile(path.join(dir, "shanghai.pmtiles"), "x");
      await writeFile(path.join(dir, "tokyo.pmtiles"), "x");
      await writeFile(indexPath(dir), "{ not valid json");
      const index = await readIndex(dir);
      expect(index.regions.map((r) => r.name)).toEqual(["shanghai", "tokyo"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scanIndex skips corrupt sidecars and keeps the readable ones", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      await writeMetadata(shanghai, dir);
      await writeFile(path.join(dir, "shanghai.pmtiles"), "x");
      await writeFile(path.join(dir, "bad.metadata.json"), "{ nope");
      await writeFile(path.join(dir, "bad.pmtiles"), "x");
      const index = await scanIndex(dir);
      // the corrupt sidecar is dropped from the catalog, the valid one kept
      expect(index.regions.map((r) => r.name)).toEqual(["shanghai"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("readMetadata rejects a sidecar that is not a region object", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      await writeFile(path.join(dir, "shanghai.metadata.json"), "null");
      await expect(readMetadata(dir, "shanghai")).rejects.toThrow(/invalid/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scanIndex skips sidecars that parse to a non-object value", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      await writeMetadata(shanghai, dir);
      await writeFile(path.join(dir, "shanghai.pmtiles"), "x");
      await writeFile(path.join(dir, "bad.metadata.json"), "null");
      await writeFile(path.join(dir, "bad.pmtiles"), "x");
      const index = await scanIndex(dir);
      expect(index.regions.map((r) => r.name)).toEqual(["shanghai"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("withoutRegion returns a new index without the region", () => {
    const index: PmtilesIndex = {
      version: 1,
      updatedAt: "t",
      regions: [shanghai, tokyo],
    };
    const next = withoutRegion(index, "tokyo");
    expect(next.regions.map((r) => r.name)).toEqual(["shanghai"]);
    // the original index is untouched
    expect(index.regions).toHaveLength(2);
  });
});
