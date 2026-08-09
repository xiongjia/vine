// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

// maplibre-gl registers an inline worker at module scope via
// URL.createObjectURL, which jsdom does not implement — polyfill before the
// module loads (vi.hoisted runs above the imports below). The mutation is
// global but confined to this file: vitest isolates each test file, and no
// other file imports maplibre-gl unmocked.
vi.hoisted(() => {
  const urlCtor = window.URL as typeof URL & {
    createObjectURL?: (obj: Blob) => string;
    revokeObjectURL?: (url: string) => void;
  };
  if (!urlCtor.createObjectURL) {
    urlCtor.createObjectURL = () => "blob:maplibre-test";
    urlCtor.revokeObjectURL = () => {};
  }
});

// Intentionally NOT mocked: exercise the real maplibre AttributionControl to
// pin the single-segment dedupe the MapController relies on (maplibre 5.24
// merges source attributions with customAttribution and skips sources whose
// attribution is already listed — identical strings yield exactly one segment).
import { AttributionControl } from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";

/** Minimal stand-in for the Map surface the attribution control touches. */
function createFakeMap(sourceAttribution: string) {
  const listeners = new Map<string, Array<() => void>>();
  return {
    style: {
      stylesheet: { owner: "test", id: "test-style" },
      tileManagers: {
        protomaps: {
          used: true,
          getSource: () => ({ attribution: sourceAttribution }),
        },
      },
    },
    on(type: string, cb: () => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), cb]);
    },
    off(type: string, cb: () => void) {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((l) => l !== cb),
      );
    },
    getCanvasContainer() {
      return document.createElement("div");
    },
    _getUIString(key: string) {
      return key;
    },
  };
}

function renderAttribution(
  control: AttributionControl,
  sourceAttribution: string,
): string {
  const el = control.onAdd(
    createFakeMap(sourceAttribution) as unknown as MapLibreMap,
  );
  document.body.appendChild(el);
  try {
    return el.querySelector(".maplibregl-ctrl-attrib-inner")?.innerHTML ?? "";
  } finally {
    // full lifecycle: onRemove detaches the container and unsubscribes the
    // map event listeners registered in onAdd
    control.onRemove();
  }
}

describe("maplibre AttributionControl contract (real 5.24)", () => {
  it("renders exactly one segment when customAttribution equals the source attribution", () => {
    const inner = renderAttribution(
      new AttributionControl({
        compact: true,
        customAttribution: "© Example Co · Protomaps",
      }),
      "© Example Co · Protomaps",
    );

    expect(inner).toBe("© Example Co · Protomaps");
    expect(inner).not.toContain("maplibre.org");
    expect(inner).not.toContain(" | ");
  });

  it("the maplibre default injects a MapLibre link next to the source attribution", () => {
    // new AttributionControl() picks up maplibre 5.24's default customAttribution
    const inner = renderAttribution(
      new AttributionControl(),
      "© Example Co · Protomaps",
    );

    expect(inner).toContain("maplibre.org");
    expect(inner).toContain(" | ");
  });
});
