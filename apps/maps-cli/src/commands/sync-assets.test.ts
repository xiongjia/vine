import { describe, expect, it } from "vitest";
import { ASSET_KINDS, collectOnlyValues, parseOnlyKinds } from "./sync-assets";

describe("collectOnlyValues (--only commander parser)", () => {
  it("splits comma-separated values and trims whitespace", () => {
    expect(collectOnlyValues("pmtiles, glyphs ", [])).toEqual([
      "pmtiles",
      "glyphs",
    ]);
  });

  it("appends to the previous list (repeatable --only)", () => {
    expect(collectOnlyValues("glyphs", ["pmtiles"])).toEqual([
      "pmtiles",
      "glyphs",
    ]);
  });

  it("drops empty segments", () => {
    expect(collectOnlyValues("widget,,glyphs", [])).toEqual([
      "widget",
      "glyphs",
    ]);
    expect(collectOnlyValues("", [])).toEqual([]);
  });
});

describe("parseOnlyKinds", () => {
  it("defaults to all asset kinds when --only is omitted", () => {
    expect(parseOnlyKinds(undefined)).toEqual([...ASSET_KINDS]);
    expect(parseOnlyKinds([])).toEqual([...ASSET_KINDS]);
  });

  it("keeps only the requested kinds", () => {
    expect(parseOnlyKinds(["pmtiles"])).toEqual(["pmtiles"]);
    expect(parseOnlyKinds(["widget", "glyphs"])).toEqual(["widget", "glyphs"]);
  });

  it("treats 'all' as every kind", () => {
    expect(parseOnlyKinds(["all"])).toEqual([...ASSET_KINDS]);
  });

  it("trims whitespace and dedupes repeats", () => {
    expect(parseOnlyKinds([" pmtiles ", "pmtiles"])).toEqual(["pmtiles"]);
  });

  it("rejects unknown kinds", () => {
    expect(() => parseOnlyKinds(["tiles"])).toThrow(
      /invalid --only kind: "tiles" \(expected widget \| pmtiles \| glyphs or all\)/,
    );
  });

  it("rejects unknown kinds even when 'all' is present", () => {
    expect(() => parseOnlyKinds(["all", "tiles"])).toThrow(
      /invalid --only kind: "tiles"/,
    );
  });
});
