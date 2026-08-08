/**
 * GCJ-02 (Amap/Baidu Mars coordinates) -> WGS-84 (OSM/MapLibre).
 * Only mainland-China coordinates need conversion (offset ~300-500m); overseas coords like Tokyo are unaffected.
 * Formula and verified values come from the research notes make-own-map.md.
 */
/* eslint-disable no-loss-of-precision */ // Mars-coordinate constants from the Python original; float precision loss is negligible
function transformLat(x: number, y: number): number {
  let r =
    -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  r += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  r += ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3;
  r += ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3;
  return r;
}

function transformLng(x: number, y: number): number {
  let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  r += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  r += ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3;
  r += ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3;
  return r;
}

/** GCJ-02 -> WGS-84, returns [lng, lat]. */
export function gcj02ToWgs84(lng: number, lat: number): [number, number] {
  const dLat = transformLat(lng - 105, lat - 35);
  const dLng = transformLng(lng - 105, lat - 35);
  const radLat = (lat / 180) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - 0.00669342162296594323 * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  const dLatFinal =
    (dLat * 180) /
    (((6378245 * (1 - 0.00669342162296594323)) / (magic * sqrtMagic)) * Math.PI);
  const dLngFinal = (dLng * 180) / ((6378245 / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return [lng * 2 - (lng + dLngFinal), lat * 2 - (lat + dLatFinal)];
}
