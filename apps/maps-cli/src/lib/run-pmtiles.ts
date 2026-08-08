import { spawnSync } from "node:child_process";

/**
 * Invoke the external Go command to work with pmtiles (installed by the developer; both are supported):
 *   brew install pmtiles                        → binary `pmtiles`
 *   go install github.com/protomaps/go-pmtiles@latest → binary `go-pmtiles`
 * Auto-detected (tries `pmtiles` first, then `go-pmtiles`); override with `VINE_PMTILES_BIN`.
 */
const CANDIDATES = ["pmtiles", "go-pmtiles"];

function available(bin: string): boolean {
  const res = spawnSync(bin, ["--help"], { encoding: "utf8" });
  return res.error === undefined && res.status === 0;
}

export function pmtilesBin(): string {
  const override = process.env.VINE_PMTILES_BIN;
  if (override) return override;
  return CANDIDATES.find(available) ?? CANDIDATES[0];
}

export function pmtilesAvailable(): boolean {
  return available(pmtilesBin());
}

export function installHint(): void {
  console.error(
    "pmtiles command not found. Install one of:\n" +
      "  brew install pmtiles\n" +
      "  or go install github.com/protomaps/go-pmtiles@latest (binary name go-pmtiles)\n" +
      " (or set VINE_PMTILES_BIN to the binary path)",
  );
}

export interface RunResult {
  ok: boolean;
  stdout: string;
}

/** Run the pmtiles command; prints stderr and exits on failure. */
export function runPmtiles(args: string[], opts?: { dryRun?: boolean; quiet?: boolean }): RunResult {
  const bin = pmtilesBin();
  if (opts?.dryRun) {
    console.log(`[dry-run] ${bin} ${args.join(" ")}`);
    return { ok: true, stdout: "" };
  }
  const res = spawnSync(bin, args, { encoding: "utf8" });
  if (res.error) {
    installHint();
    process.exit(1);
  }
  if (!opts?.quiet) process.stdout.write(res.stdout);
  if (res.status !== 0) {
    if (res.stderr) process.stderr.write(res.stderr);
    process.exit(res.status ?? 1);
  }
  return { ok: true, stdout: res.stdout ?? "" };
}
