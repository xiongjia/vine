// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock maplibre's Map so the controller lifecycle can be tested without WebGL.
// Shared state must live inside vi.hoisted (the factory is hoisted above the
// imports).
const { styleLoadListeners, state, setStyleMock } = vi.hoisted(() => {
  const styleLoadListeners: Array<() => void> = [];
  const state = { styleLoaded: false };
  const setStyleMock = vi.fn();
  return { styleLoadListeners, state, setStyleMock };
});

vi.mock("maplibre-gl", () => ({
  Map: class MockMap {
    // constructor opts intentionally ignored — the real Map signature is not
    // exercised by these tests
    addControl() {}
    removeControl() {}
    loaded() {
      return state.styleLoaded;
    }
    isStyleLoaded() {
      return state.styleLoaded;
    }
    once(event: string, cb: () => void) {
      if (event === "style.load") styleLoadListeners.push(cb);
    }
    off() {}
    on() {}
    remove() {}
    getContainer() {
      return document.createElement("div");
    }
    getCenter() {
      return { lng: 0, lat: 0 };
    }
    getZoom() {
      return 1;
    }
    flyTo() {}
    jumpTo() {}
    fitBounds() {}
    setMaxBounds() {}
    setStyle = setStyleMock;
  },
  NavigationControl: class {},
  addProtocol: vi.fn(),
}));

vi.mock("pmtiles", () => ({
  Protocol: class {
    tile = vi.fn();
  },
}));

import { MapController } from "./map-controller";
import type { ProtomapsBasemapOptions } from "./basemap/protomaps";
import type { MapFlavor } from "./basemap/protomaps";

const basemap = (flavor: MapFlavor = "light"): ProtomapsBasemapOptions => ({
  url: "pmtiles:///x",
  flavor,
});

function makeController() {
  return new MapController(document.createElement("div"), {
    basemap: basemap(),
    center: [0, 0],
    zoom: 1,
    navControl: false,
  });
}

beforeEach(() => {
  state.styleLoaded = false;
  styleLoadListeners.length = 0;
  setStyleMock.mockClear();
});

describe("MapController.setStyle", () => {
  it("applies immediately when the style is already loaded", () => {
    state.styleLoaded = true;
    const c = makeController();
    c.setStyle(basemap("dark"));

    expect(setStyleMock).toHaveBeenCalledTimes(1);
    expect(c.basemap.flavor).toBe("dark");
    c.destroy();
  });

  it("defers until style.load while the style is still loading", () => {
    const c = makeController();
    c.setStyle(basemap("dark"));

    expect(setStyleMock).not.toHaveBeenCalled();
    // the requested basemap is recorded eagerly so later changes diff correctly
    expect(c.basemap.flavor).toBe("dark");

    for (const cb of styleLoadListeners) cb();
    expect(setStyleMock).toHaveBeenCalledTimes(1);
    c.destroy();
  });

  it("never applies a deferred style after the map is destroyed", () => {
    const c = makeController();
    c.setStyle(basemap("dark"));
    c.destroy();

    for (const cb of styleLoadListeners) cb();
    expect(setStyleMock).not.toHaveBeenCalled();
  });
});
