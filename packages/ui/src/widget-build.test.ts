// @vitest-environment node
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { widgetManifestPlugin } from "./lib/widget-build";

// Narrow view of the Plugin interface so the test can invoke the writeBundle
// hook directly with a fake bundle (the full Rollup OutputBundle type is not
// worth constructing here).
type WriteBundlePlugin = {
  writeBundle: (
    options: { dir: string },
    bundle: Record<string, unknown>,
  ) => Promise<void> | void;
};

const tmpDirs: string[] = [];
function makeWidgetDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "vine-widget-build-"));
  tmpDirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const IMPORT_MAP_KEYS = [
  "react",
  "react/jsx-runtime",
  "react-dom/client",
  "maplibre-gl",
  "pmtiles",
  "@protomaps/basemaps",
];

describe("widgetManifestPlugin", () => {
  it("minifies, hashes and manifests the emitted files", async () => {
    const dir = makeWidgetDir();
    writeFileSync(
      path.join(dir, "map-widget.js"),
      [
        'import { createRoot } from "react-dom/client";',
        "export function createMapWidget(container) {",
        "  const root = createRoot(container);",
        "  return root;",
        "}",
      ].join("\n"),
    );
    writeFileSync(path.join(dir, "map-widget.css"), ".map { color: red; }");
    const plugin = widgetManifestPlugin() as unknown as WriteBundlePlugin;
    await plugin.writeBundle(
      { dir },
      { "map-widget.js": {}, "map-widget.css": {} },
    );

    const names = readdirSync(dir);
    // The original names are replaced by content-hashed ones.
    expect(names).not.toContain("map-widget.js");
    expect(names).not.toContain("map-widget.css");
    const jsName = names.find(
      (n) => n.startsWith("map-widget-") && n.endsWith(".js"),
    );
    const cssName = names.find(
      (n) => n.startsWith("map-widget-") && n.endsWith(".css"),
    );
    const importMapName = names.find((n) => n.startsWith("import-map-"));
    expect(jsName).toBeDefined();
    expect(cssName).toBeDefined();
    expect(importMapName).toBeDefined();

    // The JS is terser-minified to a single line with bare imports intact.
    const js = readFileSync(path.join(dir, jsName!), "utf8");
    expect(js).not.toContain("\n");
    expect(js).toMatch(/from"react-dom\/client"/);

    const manifest = JSON.parse(
      readFileSync(path.join(dir, "widget.json"), "utf8"),
    );
    expect(manifest.entry).toBe(jsName);
    expect(manifest.css).toBe(cssName);
    expect(manifest.files).toHaveLength(3); // js + css + import-map
    for (const file of manifest.files) {
      expect(file.hash).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(Object.keys(manifest.importMap)).toEqual(IMPORT_MAP_KEYS);
    // dependencies use the { version, cdn } object form, pinned to real installs
    expect(manifest.dependencies.react).toMatchObject({
      version: expect.any(String),
      cdn: expect.stringContaining("esm.sh/"),
    });
    // The standalone import-map file matches the manifest's importMap.
    expect(
      JSON.parse(readFileSync(path.join(dir, importMapName!), "utf8")),
    ).toEqual(manifest.importMap);
  });

  it("throws when the build emits neither js nor css", async () => {
    const dir = makeWidgetDir();
    const plugin = widgetManifestPlugin() as unknown as WriteBundlePlugin;
    await expect(plugin.writeBundle({ dir }, {})).rejects.toThrow(
      /widget build produced no js output/,
    );
  });

  it("throws instead of shipping an empty bundle when terser fails", async () => {
    const dir = makeWidgetDir();
    writeFileSync(path.join(dir, "map-widget.js"), "export const x = ;");
    writeFileSync(path.join(dir, "map-widget.css"), "a{}");
    const plugin = widgetManifestPlugin() as unknown as WriteBundlePlugin;
    await expect(
      plugin.writeBundle(
        { dir },
        { "map-widget.js": {}, "map-widget.css": {} },
      ),
    ).rejects.toThrow();
  });

  it("removes stale hashed artifacts from previous builds", async () => {
    const dir = makeWidgetDir();
    writeFileSync(
      path.join(dir, "map-widget.js"),
      'import { createRoot } from "react-dom/client";\nexport function createMapWidget() {}\n',
    );
    writeFileSync(path.join(dir, "map-widget.css"), "a{}");
    // Artifacts left behind by an earlier build with different content.
    writeFileSync(path.join(dir, "map-widget-deadbeef0000.js"), "old");
    writeFileSync(path.join(dir, "map-widget-000000000000.css"), "old");
    writeFileSync(path.join(dir, "import-map-oldhash1234.json"), "{}");
    // Unrelated files must never be touched.
    writeFileSync(path.join(dir, "README.txt"), "keep me");

    const plugin = widgetManifestPlugin() as unknown as WriteBundlePlugin;
    await plugin.writeBundle(
      { dir },
      { "map-widget.js": {}, "map-widget.css": {} },
    );

    const names = readdirSync(dir);
    expect(names).not.toContain("map-widget-deadbeef0000.js");
    expect(names).not.toContain("map-widget-000000000000.css");
    expect(names).not.toContain("import-map-oldhash1234.json");
    expect(names).toContain("README.txt");
  });
});
