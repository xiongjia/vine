import type { Map as MapLibreMap } from "maplibre-gl";
import { Marker, Popup } from "maplibre-gl";
import type { Feature, Point } from "geojson";

export interface MarkerFeatureProps {
  /** Text label rendered next to the marker. */
  label?: string;
  /**
   * HTML content injected via Popup.setHTML — **trusted callers only**
   * (XSS vector for untrusted input).
   */
  popupContent?: string;
  /**
   * Plain-text popup content (escaped, line breaks preserved) — safe for
   * untrusted data. `popupContent` (HTML) takes precedence when both set.
   */
  popupText?: string;
  /** Background color for the default dot marker (ignored when `emoji` is set). */
  color?: string;
  /** Render an emoji glyph instead of the colored dot (e.g. "☕", "🏁", "⭐"). */
  emoji?: string;
}

export type MarkerFeature = Feature<Point, MarkerFeatureProps>;

/**
 * Render point features as maplibre Markers (DOM element + optional label and
 * popup). `openIndex` optionally opens that marker's popup right after add
 * (e.g. the first marker on first display); default `undefined` keeps every
 * popup closed. Returns a cleanup that removes every marker it created.
 */
export function syncMarkerLayer(
  map: MapLibreMap,
  features: MarkerFeature[],
  openIndex?: number,
): () => void {
  const markers: Marker[] = [];
  for (const feature of features) {
    const [lng, lat] = feature.geometry.coordinates as [number, number];
    const props = feature.properties ?? {};

    const el = document.createElement("div");
    // maplibre positions the element itself (inline transform), so no
    // transform utilities here — use anchor "bottom" and order [label, glyph]
    // so the glyph's bottom sits exactly on the coordinate.
    el.className = "flex flex-col items-center";
    if (props.label) {
      const label = document.createElement("span");
      label.className =
        "mb-0.5 whitespace-nowrap rounded bg-slate-900/75 px-1.5 py-px text-xs text-white";
      label.textContent = props.label;
      el.appendChild(label);
    }
    if (props.emoji) {
      const glyph = document.createElement("span");
      glyph.className = "-mb-1 text-xl leading-none drop-shadow";
      glyph.textContent = props.emoji;
      el.appendChild(glyph);
    } else {
      const dot = document.createElement("span");
      dot.className = "h-3.5 w-3.5 rounded-full border-2 border-white shadow";
      dot.style.background = props.color ?? "#e11d48";
      el.appendChild(dot);
    }

    const marker = new Marker({ element: el, anchor: "bottom" }).setLngLat([
      lng,
      lat,
    ]);
    if (props.popupContent) {
      marker.setPopup(new Popup({ offset: 24 }).setHTML(props.popupContent));
    } else if (props.popupText) {
      // textContent on a detached div — no HTML parsing, safe for untrusted data
      const content = document.createElement("div");
      content.style.whiteSpace = "pre-line";
      content.textContent = props.popupText;
      marker.setPopup(new Popup({ offset: 24 }).setDOMContent(content));
    }
    marker.addTo(map);
    markers.push(marker);
  }
  if (openIndex !== undefined) {
    const target = markers[openIndex];
    if (target) target.togglePopup();
  }
  return () => {
    for (const marker of markers) marker.remove();
  };
}
