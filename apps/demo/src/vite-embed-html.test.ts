import { describe, expect, it } from "vitest";
import {
  embedHtmlUrls,
  renderEmbedHtml,
  storageRoot,
  WIDGET_CSS_TOKEN,
  WIDGET_JS_TOKEN,
  PMTILES_PREFIX_TOKEN,
  GLYPHS_URL_TOKEN,
} from "../vite-embed-html";

const R2_PREFIX = "pmtiles://https://cdn.example.com/vine/pmtiles/";
const R2_GLYPHS = "https://cdn.example.com/vine/glyphs/{fontstack}/{range}.pbf";

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
    expect(embedHtmlUrls({})).toEqual({
      widgetCss: "/widget/map-widget.css",
      widgetJs: "/widget/map-widget.js",
      pmtilesPrefix: "pmtiles:///pmtiles/",
      glyphs: "/glyphs/{fontstack}/{range}.pbf",
    });
  });

  it("injects R2 URLs and derives the widget URLs from the pmtiles prefix", () => {
    expect(
      embedHtmlUrls({
        VITE_PMTILES_URL_PREFIX: R2_PREFIX,
        VITE_GLYPHS_URL: R2_GLYPHS,
      }),
    ).toEqual({
      widgetCss: "https://cdn.example.com/vine/widget/map-widget.css",
      widgetJs: "https://cdn.example.com/vine/widget/map-widget.js",
      pmtilesPrefix: R2_PREFIX,
      glyphs: R2_GLYPHS,
    });
  });
});

describe("renderEmbedHtml", () => {
  const template = [
    `<link rel="stylesheet" href="${WIDGET_CSS_TOKEN}" />`,
    `import { createMapWidget } from "${WIDGET_JS_TOKEN}";`,
    `url: "${PMTILES_PREFIX_TOKEN}shanghai.pmtiles",`,
    `glyphsUrl: "${GLYPHS_URL_TOKEN}",`,
  ].join("\n");

  it("replaces every token with the injected URLs", () => {
    const urls = embedHtmlUrls({
      VITE_PMTILES_URL_PREFIX: R2_PREFIX,
      VITE_GLYPHS_URL: R2_GLYPHS,
    });
    const html = renderEmbedHtml(template, urls);
    expect(html).toBe(
      [
        `<link rel="stylesheet" href="https://cdn.example.com/vine/widget/map-widget.css" />`,
        `import { createMapWidget } from "https://cdn.example.com/vine/widget/map-widget.js";`,
        `url: "${R2_PREFIX}shanghai.pmtiles",`,
        `glyphsUrl: "${R2_GLYPHS}",`,
      ].join("\n"),
    );
  });

  it("does not interpret $ sequences in the injected values", () => {
    const urls = embedHtmlUrls({
      VITE_PMTILES_URL_PREFIX: "pmtiles://https://x.dev/vine/pmtiles/",
      VITE_GLYPHS_URL: "https://x.dev/glyphs/$&/$1/{range}.pbf",
    });
    const html = renderEmbedHtml(template, urls);
    expect(html).toContain(
      'glyphsUrl: "https://x.dev/glyphs/$&/$1/{range}.pbf"',
    );
  });

  it("leaves no token behind", () => {
    const urls = embedHtmlUrls({});
    const html = renderEmbedHtml(template, urls);
    expect(html).not.toContain("__VINE_");
  });
});
