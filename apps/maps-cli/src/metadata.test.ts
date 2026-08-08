import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildMetadata, metadataPath, readMetadata, writeMetadata } from "./lib/metadata";

describe("metadata sidecar", () => {
  it("writeMetadata / readMetadata round-trip", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      const meta = {
        name: "shanghai",
        bbox: [120.8, 30.6, 122.2, 31.9] as [number, number, number, number],
        center: [121.5, 31.2] as [number, number],
        minZoom: 0,
        maxZoom: 15,
        buildDate: "20260805",
        sizeBytes: 21000000,
        file: "shanghai.pmtiles",
      };
      await writeMetadata(meta, dir);
      const back = await readMetadata(dir, "shanghai");
      expect(back).toEqual(meta);
      const raw = await readFile(metadataPath(dir, "shanghai"), "utf8");
      expect(JSON.parse(raw)).toEqual(meta);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("buildMetadata parses `pmtiles show` plain-text output", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      const file = path.join(dir, "shanghai.pmtiles");
      // write a placeholder file just for sizeBytes
      await import("node:fs/promises").then((m) => m.writeFile(file, "x".repeat(100)));
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
});
