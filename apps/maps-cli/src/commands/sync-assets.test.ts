import { describe, expect, it } from "vitest";
import {
  ASSET_KINDS,
  collectOnlyValues,
  computeWidgetPrune,
  parseOnlyKinds,
} from "./sync-assets";

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

const MANIFEST = JSON.stringify({
  entry: "map-widget-885e9d424bea.js",
  css: "map-widget-6d4cf0bf511b.css",
  files: [
    { name: "map-widget-885e9d424bea.js", hash: "a", size: 1 },
    { name: "map-widget-6d4cf0bf511b.css", hash: "b", size: 1 },
    { name: "import-map-3b7f562d8988.json", hash: "c", size: 1 },
  ],
});

const KEYS = [
  "vine/widget/widget.json",
  "vine/widget/map-widget-885e9d424bea.js",
  "vine/widget/map-widget-6d4cf0bf511b.css",
  "vine/widget/import-map-3b7f562d8988.json",
  "vine/widget/map-widget-830c8f0d6cf7.js", // old hash
  "vine/widget/map-widget-b57bcc31a695.js", // old hash
  "vine/widget/map-widget.js", // legacy un-hashed
];

describe("computeWidgetPrune", () => {
  it("keeps manifest-referenced files and prunes everything else", () => {
    const { keep, orphans } = computeWidgetPrune(MANIFEST, KEYS);

    expect(keep).toEqual(
      new Set([
        "widget.json",
        "map-widget-885e9d424bea.js",
        "map-widget-6d4cf0bf511b.css",
        "import-map-3b7f562d8988.json",
      ]),
    );
    expect(orphans).toEqual([
      "vine/widget/map-widget-830c8f0d6cf7.js",
      "vine/widget/map-widget-b57bcc31a695.js",
      "vine/widget/map-widget.js",
    ]);
  });

  it("keeps every object when the manifest is missing", () => {
    expect(computeWidgetPrune(null, KEYS).orphans).toEqual([]);
  });

  it("keeps every object when the manifest is not valid JSON", () => {
    expect(computeWidgetPrune("not json", KEYS).orphans).toEqual([]);
  });
});
