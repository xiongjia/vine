import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  embedHtmlUrls,
  readWidgetManifest,
  renderEmbedHtml,
  storageRoot,
  WIDGET_CSS_TOKEN,
  WIDGET_JS_TOKEN,
  WIDGET_IMPORT_MAP_TOKEN,
  PMTILES_PREFIX_TOKEN,
  GLYPHS_URL_TOKEN,
  type WidgetManifest,
} from "../vite-embed-html";

const R2_PREFIX = "pmtiles://https://cdn.example.com/vine/pmtiles/";
const R2_GLYPHS = "https://cdn.example.com/vine/glyphs/{fontstack}/{range}.pbf";

/** Mimic the manifest emitted by the widget build (content-hashed names). */
const MANIFEST: WidgetManifest = {
  version: "0.0.0",
  buildTime: "2026-01-01T00:00:00.000Z",
  entry: "map-widget-0123456789ab.js",
  css: "map-widget-0123456789ab.css",
  files: [
    { name: "map-widget-0123456789ab.js", hash: "h1", size: 1024 },
    { name: "map-widget-0123456789ab.css", hash: "h2", size: 512 },
  ],
  dependencies: {
    react: {
      version: "19.2.7",
      cdn: "https://cdn.jsdelivr.net/npm/react@19.2.7/+esm",
    },
  },
  importMap: { react: "https://cdn.jsdelivr.net/npm/react@19.2.7/+esm" },
};

describe("storageRoot", () => {
  it("extracts the storage root from a pmtiles prefix", () => {
    expect(storageRoot(R2_PREFIX)).toBe("https://cdn.example.com/vine");
  });

  it("handles a prefix without a trailing slash", () => {
    expect(storageRoot("pmtiles://https://x.dev/vine/pmtiles")).toBe(
      "https://x.dev/vine",
    );
  });

  it("keeps the dev same-origin default at the root", () => {
    expect(storageRoot("pmtiles:///pmtiles/")).toBe("");
  });
});

describe("embedHtmlUrls", () => {
  it("falls back to dev same-origin URLs without env vars", () => {
    expect(embedHtmlUrls({}, MANIFEST)).toEqual({
      widgetCss: "/widget/map-widget-0123456789ab.css",
      widgetJs: "/widget/map-widget-0123456789ab.js",
      widgetImportMapJson: JSON.stringify(MANIFEST.importMap),
      pmtilesPrefix: "pmtiles:///pmtiles/",
      glyphs: "/glyphs/{fontstack}/{range}.pbf",
    });
  });

  it("injects R2 URLs and derives the widget URLs from the pmtiles prefix", () => {
    expect(
      embedHtmlUrls(
        {
          VITE_PMTILES_URL_PREFIX: R2_PREFIX,
          VITE_GLYPHS_URL: R2_GLYPHS,
        },
        MANIFEST,
      ),
    ).toEqual({
      widgetCss:
        "https://cdn.example.com/vine/widget/map-widget-0123456789ab.css",
      widgetJs:
        "https://cdn.example.com/vine/widget/map-widget-0123456789ab.js",
      widgetImportMapJson: JSON.stringify(MANIFEST.importMap),
      pmtilesPrefix: R2_PREFIX,
      glyphs: R2_GLYPHS,
    });
  });

  it("HTML-escapes the import map so it cannot break out of the script tag", () => {
    const hostile: WidgetManifest = {
      ...MANIFEST,
      importMap: {
        x: "https://evil.example/</script><script>alert(1)</script>",
      },
    };
    expect(embedHtmlUrls({}, hostile).widgetImportMapJson).not.toContain("<");
    expect(embedHtmlUrls({}, hostile).widgetImportMapJson).toContain("\\u003c");
  });
});

describe("readWidgetManifest", () => {
  it("loads a valid widget.json", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "vine-widget-"));
    writeFileSync(path.join(dir, "widget.json"), JSON.stringify(MANIFEST));
    expect(readWidgetManifest(dir)).toEqual(MANIFEST);
  });

  it("throws a helpful error when widget.json is missing", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "vine-widget-"));
    expect(() => readWidgetManifest(dir)).toThrow(/build:widget/);
  });
});

describe("renderEmbedHtml", () => {
  const template = [
    `<link rel="stylesheet" href="${WIDGET_CSS_TOKEN}" />`,
    `<script type="importmap">\n  ${WIDGET_IMPORT_MAP_TOKEN}\n</script>`,
    `import { createMapWidget } from "${WIDGET_JS_TOKEN}";`,
    `url: "${PMTILES_PREFIX_TOKEN}shanghai.pmtiles",`,
    `glyphsUrl: "${GLYPHS_URL_TOKEN}",`,
  ].join("\n");

  it("replaces every token with the injected URLs", () => {
    const urls = embedHtmlUrls(
      {
        VITE_PMTILES_URL_PREFIX: R2_PREFIX,
        VITE_GLYPHS_URL: R2_GLYPHS,
      },
      MANIFEST,
    );
    const html = renderEmbedHtml(template, urls);
    expect(html).toBe(
      [
        `<link rel="stylesheet" href="https://cdn.example.com/vine/widget/map-widget-0123456789ab.css" />`,
        `<script type="importmap">\n  ${JSON.stringify(MANIFEST.importMap)}\n</script>`,
        `import { createMapWidget } from "https://cdn.example.com/vine/widget/map-widget-0123456789ab.js";`,
        `url: "${R2_PREFIX}shanghai.pmtiles",`,
        `glyphsUrl: "${R2_GLYPHS}",`,
      ].join("\n"),
    );
  });

  it("does not interpret $ sequences in the injected values", () => {
    const urls = embedHtmlUrls(
      {
        VITE_PMTILES_URL_PREFIX: "pmtiles://https://x.dev/vine/pmtiles/",
        VITE_GLYPHS_URL: "https://x.dev/glyphs/$&/$1/{range}.pbf",
      },
      MANIFEST,
    );
    const html = renderEmbedHtml(template, urls);
    expect(html).toContain(
      'glyphsUrl: "https://x.dev/glyphs/$&/$1/{range}.pbf"',
    );
  });

  it("leaves no token behind", () => {
    const urls = embedHtmlUrls({}, MANIFEST);
    const html = renderEmbedHtml(template, urls);
    expect(html).not.toContain("__VINE_");
  });
});
