#!/usr/bin/env node
import { Command } from "commander";
import { gcj02ToWgs84 } from "./lib/gcj02";
import { latestBuildDate } from "./commands/build-date";
import { extractRegion } from "./commands/extract";
import { generateMetadata } from "./commands/metadata";
import { verifyRegion } from "./commands/verify";
import { listRegions } from "./commands/list";
import { uploadRegion } from "./commands/upload";
import { removeRegion } from "./commands/rm";
import { syncAssets } from "./commands/sync-assets";
import { listRegionNames } from "./presets";

const program = new Command();

program
  .name("vine-maps")
  .description(
    "PMTiles region basemap generation & upload tool. Depends on the external pmtiles command (brew install pmtiles " +
      "or go install github.com/protomaps/go-pmtiles@latest). " +
      "Use HTTPS_PROXY=http://127.0.0.1:1095 if downloads fail.",
  )
  .version("0.1.0");

program
  .command("build-date")
  .description("query the latest Protomaps build date YYYYMMDD (network)")
  .action(async () => {
    console.log(await latestBuildDate());
  });

program
  .command("extract <region>")
  .description(
    `remote-crop a region pmtiles + write metadata.json (network; regions: ${listRegionNames().join(" / ")})`,
  )
  .option("--build <YYYYMMDD>", "Protomaps build date (default: latest)")
  .option("--maxzoom <n>", "max zoom level")
  .option("--bbox <minLng,minLat,maxLng,maxLat>", "custom lng/lat bounds")
  .option("--dry-run", "print the command without running it")
  .action(
    async (
      region: string,
      opts: {
        build?: string;
        maxzoom?: string;
        bbox?: string;
        dryRun?: boolean;
      },
    ) => {
      await extractRegion(region, opts);
    },
  );

program
  .command("metadata <region>")
  .description("generate/refresh metadata.json for an existing .pmtiles")
  .option("--build <YYYYMMDD>", "build date (default: local)")
  .option("--bbox <minLng,minLat,maxLng,maxLat>", "custom lng/lat bounds")
  .action(async (region: string, opts: { build?: string; bbox?: string }) => {
    await generateMetadata(region, opts);
  });

program
  .command("verify <region>")
  .description("run pmtiles show and cross-check the sidecar metadata")
  .action(async (region: string) => {
    await verifyRegion(region);
  });

program
  .command("list")
  .description("list regions in the local .maps-cache/pmtiles/")
  .action(async () => {
    await listRegions();
  });

program
  .command("upload <region>")
  .description("upload pmtiles + metadata.json to R2/S3")
  .option("--storage <r2|s3>", "storage type", "r2")
  .option("--bucket <name>", "bucket name (overrides .env)")
  .option("--prefix <path>", "object prefix", "data/pmtiles")
  .option("--dry-run", "print only, do not upload")
  .action(
    async (
      region: string,
      opts: {
        storage: "r2" | "s3";
        bucket?: string;
        prefix?: string;
        dryRun?: boolean;
      },
    ) => {
      await uploadRegion(region, opts);
    },
  );

program
  .command("rm <region>")
  .description("delete remote pmtiles + metadata.json")
  .option("--storage <r2|s3>", "storage type", "r2")
  .option("--bucket <name>", "bucket name (overrides .env)")
  .option("--prefix <path>", "object prefix", "data/pmtiles")
  .option("--dry-run", "print only, do not delete")
  .action(
    async (
      region: string,
      opts: {
        storage: "r2" | "s3";
        bucket?: string;
        prefix?: string;
        dryRun?: boolean;
      },
    ) => {
      await removeRegion(region, opts);
    },
  );

program
  .command("sync-assets")
  .description(
    "sync widget assets + pmtiles + glyphs to R2/S3 (publish option B)",
  )
  .option("--storage <r2|s3>", "storage type", "r2")
  .option("--bucket <name>", "bucket name (overrides .env)")
  .option("--prefix <path>", "object prefix", "data")
  .option("--dry-run", "print only, do not sync")
  .action(
    async (opts: {
      storage: "r2" | "s3";
      bucket?: string;
      prefix?: string;
      dryRun?: boolean;
    }) => {
      await syncAssets(opts);
    },
  );

program
  .command("gcj2wgs <lng> <lat>")
  .description("convert GCJ-02 (Amap/Baidu) to WGS-84")
  .action((lng: string, lat: string) => {
    const [olng, olat] = gcj02ToWgs84(Number(lng), Number(lat));
    console.log(`${olng.toFixed(6)}, ${olat.toFixed(6)}`);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  // Expected command failures (validation, missing config, network, …) throw
  // from the async actions — print the message without the stack trace.
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
