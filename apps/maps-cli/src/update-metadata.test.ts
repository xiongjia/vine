import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { INDEX_FILE_NAME, readIndex } from "./lib/metadata";
import { updateMetadataInDir } from "./commands/update-metadata";

/**
 * Fake pmtiles binary: accepts `--help` (availability probe) and `show <file>`,
 * printing a fixed header so the command never needs the real Go CLI.
 */
async function makeFakePmtilesBin(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-bin-"));
  const bin = path.join(dir, "fake-pmtiles");
  await writeFile(
    bin,
    [
      "#!/bin/sh",
      'case "$1" in',
      "  --help) exit 0 ;;",
      "  show)",
      '    echo "pmtiles spec version: 3"',
      '    echo "tile type: mvt"',
      '    echo "bounds: (long: 120.800000, lat: 30.600000) (long: 122.200000, lat: 31.900000)"',
      '    echo "min zoom: 0"',
      '    echo "max zoom: 15"',
      '    echo "center: (long: 121.500000, lat: 31.200000)"',
      "    exit 0 ;;",
      "  *) exit 1 ;;",
      "esac",
    ].join("\n"),
    { mode: 0o755 },
  );
  return bin;
}

describe("update-metadata command", () => {
  const originalBin = process.env.VINE_PMTILES_BIN;
  const originalRoot = process.env.VINE_ROOT;

  afterEach(() => {
    if (originalBin === undefined) delete process.env.VINE_PMTILES_BIN;
    else process.env.VINE_PMTILES_BIN = originalBin;
    if (originalRoot === undefined) delete process.env.VINE_ROOT;
    else process.env.VINE_ROOT = originalRoot;
  });

  it("--dry-run writes nothing", async () => {
    const bin = await makeFakePmtilesBin();
    process.env.VINE_PMTILES_BIN = bin;
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      await writeFile(path.join(dir, "shanghai.pmtiles"), "x");
      await updateMetadataInDir({ dir, dryRun: true });
      expect(existsSync(path.join(dir, "shanghai.metadata.json"))).toBe(false);
      expect(existsSync(path.join(dir, INDEX_FILE_NAME))).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
      await rm(path.dirname(bin), { recursive: true, force: true });
    }
  });

  it("writes sidecars and rebuilds the index", async () => {
    const bin = await makeFakePmtilesBin();
    process.env.VINE_PMTILES_BIN = bin;
    const dir = await mkdtemp(path.join(os.tmpdir(), "maps-cli-"));
    try {
      await writeFile(path.join(dir, "shanghai.pmtiles"), "x");
      await updateMetadataInDir({ dir });
      const sidecar = JSON.parse(
        await readFile(path.join(dir, "shanghai.metadata.json"), "utf8"),
      );
      expect(sidecar).toMatchObject({
        name: "shanghai",
        file: "shanghai.pmtiles",
      });
      const index = await readIndex(dir);
      expect(index.regions.map((r) => r.name)).toEqual(["shanghai"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
      await rm(path.dirname(bin), { recursive: true, force: true });
    }
  });

  it("resolves a relative dir against the repo root", async () => {
    const bin = await makeFakePmtilesBin();
    process.env.VINE_PMTILES_BIN = bin;
    const root = await mkdtemp(path.join(os.tmpdir(), "maps-cli-root-"));
    process.env.VINE_ROOT = root;
    try {
      const cache = path.join(root, ".maps-cache", "pmtiles");
      await mkdir(cache, { recursive: true });
      await writeFile(path.join(cache, "shanghai.pmtiles"), "x");
      // relative path from the repo root, as a developer would type it
      await updateMetadataInDir({ dir: ".maps-cache/pmtiles" });
      expect(existsSync(path.join(cache, "shanghai.metadata.json"))).toBe(true);
      expect(existsSync(path.join(cache, INDEX_FILE_NAME))).toBe(true);
    } finally {
      delete process.env.VINE_ROOT;
      await rm(root, { recursive: true, force: true });
      await rm(path.dirname(bin), { recursive: true, force: true });
    }
  });
});
