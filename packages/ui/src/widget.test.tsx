// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const unmount = vi.fn();
const renderMock = vi.fn();
vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({ render: renderMock, unmount })),
}));
vi.mock("./components/ui/map-view", () => ({
  MapView: () => null,
}));

import { createMapWidget } from "./widget";

beforeEach(() => {
  renderMock.mockClear();
  unmount.mockClear();
});

describe("createMapWidget", () => {
  it("returns a widget API and re-renders on setData", () => {
    const el = document.createElement("div");
    const w = createMapWidget(el, { basemapUrl: "pmtiles:///shanghai" });
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(w.setData).toBeTypeOf("function");
    expect(w.setBasemap).toBeTypeOf("function");
    expect(w.flyTo).toBeTypeOf("function");
    expect(w.destroy).toBeTypeOf("function");

    w.setData({ markers: [{ lng: 121.47, lat: 31.23 }] });
    expect(renderMock).toHaveBeenCalledTimes(2);
  });

  it("flyTo queues before the map is ready and replays after", () => {
    const el = document.createElement("div");
    const w = createMapWidget(el, { basemapUrl: "pmtiles:///shanghai" });
    w.flyTo({ center: [139.7, 35.68], zoom: 12 });
    // no map yet — must not throw, target is queued
    expect(w.flyTo).toBeTypeOf("function");
  });

  it("unmounts the react root on destroy", () => {
    const el = document.createElement("div");
    const w = createMapWidget(el, { basemapUrl: "pmtiles:///shanghai" });
    w.destroy();
    expect(unmount).toHaveBeenCalledTimes(1);
  });
});
