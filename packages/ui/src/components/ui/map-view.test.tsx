// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MapView } from "./map-view";

vi.mock("../../lib/map/hooks/use-map-instance", () => ({
  useMapInstance: vi.fn(),
}));
vi.mock("../../lib/map/layers/marker-layer", () => ({
  syncMarkerLayer: vi.fn(() => () => {}),
}));
vi.mock("../../lib/map/layers/track-layer", () => ({
  syncTrackLayer: vi.fn(() => () => {}),
}));

import { useMapInstance } from "../../lib/map/hooks/use-map-instance";
import {
  syncMarkerLayer,
  type MarkerFeature,
} from "../../lib/map/layers/marker-layer";
import {
  syncTrackLayer,
  type TrackFeature,
} from "../../lib/map/layers/track-layer";

const useMapInstanceMock = vi.mocked(useMapInstance);
const syncMarkerLayerMock = vi.mocked(syncMarkerLayer);
const syncTrackLayerMock = vi.mocked(syncTrackLayer);

beforeEach(() => {
  useMapInstanceMock.mockClear();
  syncMarkerLayerMock.mockClear();
  syncTrackLayerMock.mockClear();
});

function makeController(
  center: [number, number] = [1, 2],
  zoom = 3,
  basemap: { url: string; flavor?: string } = { url: "pmtiles:///x" },
) {
  return {
    map: {},
    basemap,
    getCenter: vi.fn(() => ({ lng: center[0], lat: center[1] })),
    getZoom: vi.fn(() => zoom),
    jumpTo: vi.fn(),
    onReady: vi.fn(),
    setShowCenterHud: vi.fn(),
    setNavControl: vi.fn(),
    setMaxBounds: vi.fn(),
    setStyle: vi.fn(),
  };
}

describe("MapView", () => {
  it("renders the map container div", () => {
    useMapInstanceMock.mockReturnValue(makeController() as never);
    const { container } = render(
      <MapView basemap={{ url: "pmtiles:///x" }} center={[1, 2]} zoom={3} />,
    );
    expect(container.querySelector("div")?.className).toContain(
      "relative w-full",
    );
  });

  it("passes the basemap URL as the controller reset key (flavor changes do not recreate)", () => {
    useMapInstanceMock.mockReturnValue(makeController() as never);
    const { rerender } = render(
      <MapView
        basemap={{ url: "pmtiles:///shanghai" }}
        center={[1, 2]}
        zoom={3}
      />,
    );
    expect(useMapInstanceMock.mock.calls[0]![2]).toBe("pmtiles:///shanghai");

    rerender(
      <MapView
        basemap={{ url: "pmtiles:///tokyo" }}
        center={[1, 2]}
        zoom={3}
      />,
    );
    expect(useMapInstanceMock.mock.calls[1]![2]).toBe("pmtiles:///tokyo");
  });

  it("syncs markers as GeoJSON point features", () => {
    useMapInstanceMock.mockReturnValue(makeController() as never);
    render(
      <MapView
        basemap={{ url: "pmtiles:///x" }}
        center={[1, 2]}
        zoom={3}
        markers={[{ lng: 121.47, lat: 31.23, label: "A", emoji: "☕" }]}
      />,
    );
    expect(syncMarkerLayerMock).toHaveBeenCalledTimes(1);
    const features = syncMarkerLayerMock.mock.calls[0]![1] as MarkerFeature[];
    expect(features).toHaveLength(1);
    expect(features[0]!.geometry).toEqual({
      type: "Point",
      coordinates: [121.47, 31.23],
    });
    expect(features[0]!.properties).toMatchObject({ label: "A", emoji: "☕" });
    // default: no marker auto-opened
    expect(syncMarkerLayerMock.mock.calls[0]![2]).toBeUndefined();
  });

  it("passes openMarkerIndex through to the marker layer", () => {
    useMapInstanceMock.mockReturnValue(makeController() as never);
    render(
      <MapView
        basemap={{ url: "pmtiles:///x" }}
        center={[1, 2]}
        zoom={3}
        markers={[
          { lng: 1, lat: 1 },
          { lng: 2, lat: 2 },
        ]}
        openMarkerIndex={1}
      />,
    );
    expect(syncMarkerLayerMock.mock.calls[0]![2]).toBe(1);
  });

  it("syncs tracks as GeoJSON line features", () => {
    useMapInstanceMock.mockReturnValue(makeController() as never);
    render(
      <MapView
        basemap={{ url: "pmtiles:///x" }}
        center={[1, 2]}
        zoom={3}
        tracks={[
          {
            name: "T",
            color: "#2563eb",
            coordinates: [
              [121.46, 31.185],
              [121.45, 31.19],
            ],
          },
        ]}
      />,
    );
    expect(syncTrackLayerMock).toHaveBeenCalledTimes(1);
    const features = syncTrackLayerMock.mock.calls[0]![1] as TrackFeature[];
    expect(features).toHaveLength(1);
    expect(features[0]!.geometry.type).toBe("LineString");
    expect(features[0]!.properties).toMatchObject({
      name: "T",
      color: "#2563eb",
    });
  });

  it("jumpTo moves the camera when center/zoom props change", () => {
    const controller = makeController([1, 2], 3);
    useMapInstanceMock.mockReturnValue(controller as never);
    const { rerender } = render(
      <MapView basemap={{ url: "pmtiles:///x" }} center={[1, 2]} zoom={3} />,
    );
    rerender(
      <MapView basemap={{ url: "pmtiles:///x" }} center={[5, 6]} zoom={8} />,
    );
    expect(controller.jumpTo).toHaveBeenCalledWith({ center: [5, 6], zoom: 8 });
  });

  it("re-applies the style in place when the flavor changes (no recreation)", () => {
    const controller = makeController([1, 2], 3, {
      url: "pmtiles:///x",
      flavor: "light",
    });
    useMapInstanceMock.mockReturnValue(controller as never);
    const { rerender } = render(
      <MapView
        basemap={{ url: "pmtiles:///x", flavor: "light" }}
        center={[1, 2]}
        zoom={3}
      />,
    );
    // same basemap as constructed — no redundant style swap on mount
    expect(controller.setStyle).not.toHaveBeenCalled();

    rerender(
      <MapView
        basemap={{ url: "pmtiles:///x", flavor: "dark" }}
        center={[1, 2]}
        zoom={3}
      />,
    );
    expect(controller.setStyle).toHaveBeenCalledTimes(1);
    expect(controller.setStyle).toHaveBeenCalledWith({
      url: "pmtiles:///x",
      flavor: "dark",
    });
  });

  it("applies navControl / maxBounds changes reactively", () => {
    const controller = makeController();
    useMapInstanceMock.mockReturnValue(controller as never);
    const { rerender } = render(
      <MapView basemap={{ url: "pmtiles:///x" }} center={[1, 2]} zoom={3} />,
    );
    expect(controller.setNavControl).toHaveBeenLastCalledWith(true);

    rerender(
      <MapView
        basemap={{ url: "pmtiles:///x" }}
        center={[1, 2]}
        zoom={3}
        navControl={false}
      />,
    );
    expect(controller.setNavControl).toHaveBeenLastCalledWith(false);

    const bounds: [[number, number], [number, number]] = [
      [120, 30],
      [122, 32],
    ];
    rerender(
      <MapView
        basemap={{ url: "pmtiles:///x" }}
        center={[1, 2]}
        zoom={3}
        maxBounds={bounds}
      />,
    );
    expect(controller.setMaxBounds).toHaveBeenLastCalledWith(bounds);
  });

  it("only auto-opens the marker popup on the first sync per map/index", () => {
    useMapInstanceMock.mockReturnValue(makeController() as never);
    const { rerender } = render(
      <MapView
        basemap={{ url: "pmtiles:///x" }}
        center={[1, 2]}
        zoom={3}
        markers={[{ lng: 1, lat: 1 }]}
        openMarkerIndex={0}
      />,
    );
    expect(syncMarkerLayerMock.mock.calls[0]![2]).toBe(0);

    // same map + same index after a data re-sync → keep the popup state as-is
    rerender(
      <MapView
        basemap={{ url: "pmtiles:///x" }}
        center={[1, 2]}
        zoom={3}
        markers={[
          { lng: 1, lat: 1 },
          { lng: 2, lat: 2 },
        ]}
        openMarkerIndex={0}
      />,
    );
    expect(syncMarkerLayerMock.mock.calls[1]![2]).toBeUndefined();
  });

  it("toggles the HUD reactively without recreating the map", () => {
    const controller = makeController();
    useMapInstanceMock.mockReturnValue(controller as never);
    const { rerender } = render(
      <MapView basemap={{ url: "pmtiles:///x" }} center={[1, 2]} zoom={3} />,
    );
    expect(controller.setShowCenterHud).toHaveBeenLastCalledWith(false);
    rerender(
      <MapView
        basemap={{ url: "pmtiles:///x" }}
        center={[1, 2]}
        zoom={3}
        showCenterHud
      />,
    );
    expect(controller.setShowCenterHud).toHaveBeenLastCalledWith(true);
  });
});
