// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock maplibre's Map so the controller lifecycle can be tested without WebGL.
// Shared state must live inside vi.hoisted (the factory is hoisted above the
// imports).
const {
  styleLoadListeners,
  state,
  setStyleMock,
  ctorOptions,
  addCalls,
  removeCalls,
} = vi.hoisted(() => {
  const styleLoadListeners: Array<() => void> = [];
  const state = { styleLoaded: false };
  const setStyleMock = vi.fn();
  const ctorOptions: Array<Record<string, unknown>> = [];
  const addCalls: Array<{
    control: Record<string, unknown>;
    position?: string;
  }> = [];
  const removeCalls: Array<Record<string, unknown>> = [];
  return {
    styleLoadListeners,
    state,
    setStyleMock,
    ctorOptions,
    addCalls,
    removeCalls,
  };
});

vi.mock("maplibre-gl", () => ({
  Map: class MockMap {
    constructor(opts: Record<string, unknown>) {
      // capture constructor options so tests can assert control config
      ctorOptions.push(opts);
    }
    addControl(control: Record<string, unknown>, position?: string) {
      addCalls.push({ control, position });
    }
    removeControl(control: Record<string, unknown>) {
      removeCalls.push(control);
    }
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
  AttributionControl: class {
    options: { compact: boolean; customAttribution: string };
    constructor(opts: { compact: boolean; customAttribution: string }) {
      this.options = opts;
    }
  },
  addProtocol: vi.fn(),
}));

vi.mock("pmtiles", () => ({
  Protocol: class {
    tile = vi.fn();
  },
}));

import { MapController } from "./map-controller";
import { PROTOMAPS_ATTRIBUTION } from "./basemap/protomaps";
import type { ProtomapsBasemapOptions, MapFlavor } from "./basemap/protomaps";

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
  ctorOptions.length = 0;
  addCalls.length = 0;
  removeCalls.length = 0;
  setStyleMock.mockClear();
});

describe("MapController constructor", () => {
  it("disables the built-in control and adds its own with the default attribution", () => {
    const c = makeController();

    const opts = ctorOptions[ctorOptions.length - 1];
    expect(opts.attributionControl).toBe(false);
    expect(addCalls).toHaveLength(1);
    expect(addCalls[0].position).toBe("bottom-right");
    expect(addCalls[0].control.options).toEqual({
      compact: true,
      customAttribution: PROTOMAPS_ATTRIBUTION,
    });
    c.destroy();
  });

  it("uses an explicit basemap attribution as the single control segment", () => {
    const c = new MapController(document.createElement("div"), {
      basemap: {
        url: "pmtiles:///x",
        attribution: "© Example Co · Protomaps",
      },
      center: [0, 0],
      zoom: 1,
      navControl: false,
    });

    expect(addCalls[0].control.options).toEqual({
      compact: true,
      customAttribution: "© Example Co · Protomaps",
    });
    c.destroy();
  });
});

describe("MapController.setStyle attribution sync", () => {
  it("recreates the control only when the resolved attribution changes", () => {
    state.styleLoaded = true;
    const c = new MapController(document.createElement("div"), {
      basemap: { url: "pmtiles:///x", attribution: "© A" },
      center: [0, 0],
      zoom: 1,
      navControl: false,
    });
    expect(addCalls).toHaveLength(1);

    // identical attribution → no control churn
    c.setStyle({ url: "pmtiles:///x", attribution: "© A" });
    expect(removeCalls).toHaveLength(0);
    expect(addCalls).toHaveLength(1);

    // changed attribution → control recreated with the new string
    c.setStyle({ url: "pmtiles:///x", attribution: "© B" });
    expect(removeCalls).toHaveLength(1);
    expect(addCalls).toHaveLength(2);
    expect(addCalls[1].control.options).toEqual({
      compact: true,
      customAttribution: "© B",
    });
    c.destroy();
  });

  it("falls back to the default attribution when the new basemap omits it", () => {
    state.styleLoaded = true;
    const c = new MapController(document.createElement("div"), {
      basemap: { url: "pmtiles:///x", attribution: "© A" },
      center: [0, 0],
      zoom: 1,
      navControl: false,
    });

    c.setStyle({ url: "pmtiles:///x" });
    expect(addCalls[1].control.options).toEqual({
      compact: true,
      customAttribution: PROTOMAPS_ATTRIBUTION,
    });
    c.destroy();
  });

  it("recreates the control when a deferred style change also changes attribution", () => {
    const c = new MapController(document.createElement("div"), {
      basemap: { url: "pmtiles:///x", attribution: "© A" },
      center: [0, 0],
      zoom: 1,
      navControl: false,
    });
    expect(addCalls).toHaveLength(1);

    // style not yet loaded → apply (and the attribution sync) wait for style.load
    c.setStyle({ url: "pmtiles:///x", attribution: "© B" });
    expect(addCalls).toHaveLength(1);
    expect(removeCalls).toHaveLength(0);

    for (const cb of styleLoadListeners) cb();
    expect(setStyleMock).toHaveBeenCalledTimes(1);
    expect(removeCalls).toHaveLength(1);
    expect(addCalls).toHaveLength(2);
    expect(addCalls[1].control.options).toEqual({
      compact: true,
      customAttribution: "© B",
    });
    c.destroy();
  });
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
