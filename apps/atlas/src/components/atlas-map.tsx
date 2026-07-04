import * as React from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Product } from "../types";

interface AtlasMapProps {
  products: Product[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onProductSelect?: (product: Product) => void;
}

const AtlasMap = ({
  products,
  center = [121.47, 31.23],
  zoom = 11,
  className,
  onProductSelect,
}: AtlasMapProps) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<maplibregl.Map | null>(null);
  const markersRef = React.useRef<maplibregl.Marker[]>([]);

  React.useEffect(() => {
    const map = new maplibregl.Map({
      container: mapRef.current!,
      center,
      zoom,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapInstanceRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [center, zoom]);

  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add new markers
    products.forEach((product) => {
      const el = document.createElement("div");
      el.className =
        "flex items-center justify-center w-10 h-10 drop-shadow-xl cursor-pointer hover:scale-125 transition-transform";
      // Map pin SVG: red teardrop with white dot
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <defs>
    <filter id="pin-shadow-${product.id}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>
  <path d="M20 2C12.5 2 6.5 8 6.5 15.5c0 10.5 13.5 22.5 13.5 22.5s13.5-12 13.5-22.5C33.5 8 27.5 2 20 2z" fill="#ef4444" filter="url(#pin-shadow-${product.id})"/>
  <circle cx="20" cy="15" r="5" fill="white"/>
</svg>`;
      el.setAttribute("aria-label", product.name);
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");

      el.addEventListener("click", () => {
        onProductSelect?.(product);
      });

      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onProductSelect?.(product);
        }
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([product.lng, product.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [products, onProductSelect]);

  return (
    <div
      ref={mapRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export { AtlasMap };
