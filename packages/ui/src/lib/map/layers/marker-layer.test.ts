// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

// Mock maplibre Marker/Popup so the layer logic can be tested without WebGL.
// vi.hoisted: the mock factory is hoisted above the class declarations, so the
// shared state must be created there too.
const { MarkerMock, PopupMock, createdMarkers } = vi.hoisted(() => {
  const createdMarkers: Array<{
    element: HTMLElement;
    remove: () => void;
    popup: unknown;
    togglePopup: ReturnType<typeof vi.fn>;
  }> = [];
  class MarkerMock {
    element: HTMLElement;
    popup: unknown = null;
    togglePopup = vi.fn();
    constructor(opts: { element: HTMLElement }) {
      this.element = opts.element;
      createdMarkers.push(
        this as unknown as {
          element: HTMLElement;
          remove: () => void;
          popup: unknown;
          togglePopup: ReturnType<typeof vi.fn>;
        },
      );
    }
    setLngLat() {
      return this;
    }
    setPopup(popup: unknown) {
      this.popup = popup;
      return this;
    }
    addTo() {
      return this;
    }
    remove = vi.fn();
  }
  class PopupMock {
    html = "";
    dom: HTMLElement | null = null;
    setHTML(html: string) {
      this.html = html;
      return this;
    }
    setDOMContent(node: HTMLElement) {
      this.dom = node;
      return this;
    }
  }
  return { MarkerMock, PopupMock, createdMarkers };
});

vi.mock("maplibre-gl", () => ({ Marker: MarkerMock, Popup: PopupMock }));

import { syncMarkerLayer } from "./marker-layer";
import type { MarkerFeature } from "./marker-layer";

function marker(
  overrides: Partial<MarkerFeature["properties"]> = {},
): MarkerFeature {
  return {
    type: "Feature",
    properties: {
      label: undefined,
      popupContent: undefined,
      color: undefined,
      emoji: undefined,
      ...overrides,
    },
    geometry: { type: "Point", coordinates: [121.47, 31.23] },
  };
}

describe("syncMarkerLayer", () => {
  it("renders an emoji glyph (no dot) when emoji is set", () => {
    createdMarkers.length = 0;
    syncMarkerLayer({} as never, [marker({ emoji: "☕", label: "咖啡A" })]);
    const el = createdMarkers[0]!.element;
    expect(el.querySelector("span.text-xl")?.textContent).toBe("☕");
    expect(el.querySelector("span.h-3\\.5")).toBeNull();
    expect(el.querySelector("span.text-xs")?.textContent).toBe("咖啡A");
  });

  it("renders a colored dot when no emoji is set", () => {
    createdMarkers.length = 0;
    syncMarkerLayer({} as never, [marker({ color: "#e11d48" })]);
    const el = createdMarkers[0]!.element;
    const dot = el.querySelector("span.h-3\\.5") as HTMLElement;
    expect(dot).not.toBeNull();
    // jsdom normalizes the background shorthand to rgb()
    expect(dot.style.background).toBe("rgb(225, 29, 72)");
    expect(el.querySelector("span.text-xl")).toBeNull();
  });

  it("attaches a popup when popupContent is set", () => {
    createdMarkers.length = 0;
    syncMarkerLayer({} as never, [marker({ popupContent: "<b>x</b>" })]);
    expect(createdMarkers[0]!.popup).not.toBeNull();
  });

  it("renders popupText as escaped plain text (no HTML parsing)", () => {
    createdMarkers.length = 0;
    syncMarkerLayer({} as never, [marker({ popupText: "<b>x</b>\nline 2" })]);
    const popup = createdMarkers[0]!.popup as {
      dom: HTMLElement | null;
      html: string;
    };
    expect(popup.dom).not.toBeNull();
    expect(popup.dom!.textContent).toBe("<b>x</b>\nline 2");
    // no HTML path was used
    expect(popup.html).toBe("");
  });

  it("prefers popupContent (HTML) over popupText", () => {
    createdMarkers.length = 0;
    syncMarkerLayer({} as never, [
      marker({ popupContent: "<b>html</b>", popupText: "plain" }),
    ]);
    const popup = createdMarkers[0]!.popup as {
      dom: HTMLElement | null;
      html: string;
    };
    expect(popup.html).toBe("<b>html</b>");
    expect(popup.dom).toBeNull();
  });

  it("cleanup removes every created marker", () => {
    createdMarkers.length = 0;
    const cleanup = syncMarkerLayer({} as never, [
      marker({}),
      marker({ emoji: "🏁" }),
    ]);
    cleanup();
    for (const m of createdMarkers) expect(m.remove).toHaveBeenCalled();
  });

  it("opens the popup of the marker at openIndex on first render", () => {
    createdMarkers.length = 0;
    syncMarkerLayer(
      {} as never,
      [
        marker({ popupContent: "<b>a</b>" }),
        marker({ popupContent: "<b>b</b>" }),
      ],
      1,
    );
    expect(createdMarkers[0]!.togglePopup).not.toHaveBeenCalled();
    expect(createdMarkers[1]!.togglePopup).toHaveBeenCalledTimes(1);
  });

  it("keeps all popups closed when openIndex is undefined (default)", () => {
    createdMarkers.length = 0;
    syncMarkerLayer({} as never, [
      marker({ popupContent: "<b>a</b>" }),
      marker({ popupContent: "<b>b</b>" }),
    ]);
    for (const m of createdMarkers)
      expect(m.togglePopup).not.toHaveBeenCalled();
  });
});
