import * as React from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const MapView = ({
  center = [139.6917, 35.6895],
  zoom = 10,
  height = "300px",
  style,
  className,
}: MapViewProps) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<maplibregl.Map | null>(null);

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

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [center, zoom]);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height, ...style }}
      className={className}
    />
  );
}
