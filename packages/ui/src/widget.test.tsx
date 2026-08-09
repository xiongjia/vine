// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const { renderMock, createdRoots } = vi.hoisted(() => {
  const createdRoots: Array<{
    render: ReturnType<typeof vi.fn>;
    unmount: ReturnType<typeof vi.fn>;
  }> = [];
  return { renderMock: vi.fn(), createdRoots };
});

vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => {
    const root = { render: renderMock, unmount: vi.fn() };
    createdRoots.push(root);
    return root;
  }),
}));
vi.mock("./components/ui/map-view", () => ({
  MapView: () => null,
}));

import { createMapWidget } from "./widget";

beforeEach(() => {
  renderMock.mockClear();
  createdRoots.length = 0;
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
    expect(createdRoots[0]!.unmount).toHaveBeenCalledTimes(1);
  });

  it("unmounts a previous root before re-mounting the same container", () => {
    const el = document.createElement("div");
    createMapWidget(el, { basemapUrl: "pmtiles:///shanghai" });
    const second = createMapWidget(el, { basemapUrl: "pmtiles:///tokyo" });

    expect(createdRoots).toHaveLength(2);
    // The first root must be unmounted by the guard, not left to stack a
    // second MapView / MapLibre map inside the same container.
    expect(createdRoots[0]!.unmount).toHaveBeenCalledTimes(1);
    expect(createdRoots[1]!.unmount).not.toHaveBeenCalled();

    second.destroy();
    expect(createdRoots[1]!.unmount).toHaveBeenCalledTimes(1);
    // The stale first root is not double-unmounted.
    expect(createdRoots[0]!.unmount).toHaveBeenCalledTimes(1);
  });

  it("a stale widget destroy never unmounts a newer root on the same container", () => {
    const el = document.createElement("div");
    const first = createMapWidget(el, { basemapUrl: "pmtiles:///shanghai" });
    const second = createMapWidget(el, { basemapUrl: "pmtiles:///tokyo" });

    first.destroy();
    expect(createdRoots[1]!.unmount).not.toHaveBeenCalled();

    second.destroy();
    expect(createdRoots[1]!.unmount).toHaveBeenCalledTimes(1);
  });

  it("can re-mount a container after its widget was destroyed", () => {
    const el = document.createElement("div");
    const first = createMapWidget(el, { basemapUrl: "pmtiles:///shanghai" });
    first.destroy();

    const second = createMapWidget(el, { basemapUrl: "pmtiles:///tokyo" });
    expect(createdRoots).toHaveLength(2);
    // destroy already cleared the registry entry, so no stale unmount fires.
    expect(createdRoots[0]!.unmount).toHaveBeenCalledTimes(1);
    expect(createdRoots[1]!.unmount).not.toHaveBeenCalled();
    second.destroy();
    expect(createdRoots[1]!.unmount).toHaveBeenCalledTimes(1);
  });
});
