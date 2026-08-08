import type { MarkerSpec, TrackSpec } from "@vine/ui";

/**
 * Playground demo data — English labels/popups.
 * Keeps exactly ONE Chinese marker (咖啡A) to demonstrate CJK label
 * rendering with the maplibre glyph cache.
 */
function popup(title: string, address: string, rating: number, hours: string, tags: string[]): string {
  const stars = "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  return `
    <div style="min-width:230px;font-family:system-ui,sans-serif;font-size:13px;color:#0f172a">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:15px;font-weight:700">${title}</span>
        <span style="font-size:11px;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:1px 6px">Open</span>
      </div>
      <div style="color:#475569;margin-bottom:4px">📍 ${address}</div>
      <div style="color:#f59e0b;margin-bottom:4px;letter-spacing:1px">${stars} <span style="color:#64748b;letter-spacing:0">${rating.toFixed(1)}</span></div>
      <div style="color:#475569;margin-bottom:8px">🕐 ${hours}</div>
      <div>${tags.map((t) => `<span style="display:inline-block;background:#f1f5f9;color:#475569;border-radius:4px;padding:1px 7px;margin:0 4px 4px 0;font-size:12px">${t}</span>`).join(", ")}</div>
    </div>`;
}

/** Shanghai markers — mostly English; 咖啡A is the single CJK demo. */
export const shanghaiMarkers: MarkerSpec[] = [
  {
    lng: 121.47,
    lat: 31.23,
    label: "Coffee A",
    color: "#e11d48",
    emoji: "☕",
    popupContent: popup("Coffee A", "100 Binjiang Rd, Xuhui", 4.7, "08:00 - 22:00 daily", ["pour-over", "Wi-Fi", "pet friendly"]),
  },
  {
    lng: 121.49,
    lat: 31.21,
    label: "咖啡A",
    color: "#f59e0b",
    emoji: "🧋",
    popupContent: popup("咖啡A (CJK label demo)", "50 East Nanjing Rd", 4.5, "07:30 - 20:00", ["milk tea", "takeaway"]),
  },
  {
    lng: 121.44,
    lat: 31.26,
    label: "Tea House C",
    color: "#10b981",
    emoji: "🍵",
    popupContent: popup("Tea House C", "218 Yuyuan Rd, Jing'an", 4.9, "09:00 - 23:00 daily", ["special blend", "quiet"]),
  },
];

/** Shanghai track — Xuhui riverside loop. */
export const shanghaiTracks: TrackSpec[] = [
  {
    name: "Xuhui Riverside",
    color: "#2563eb",
    coordinates: [
      [121.4602, 31.185],
      [121.4605, 31.1875],
      [121.4592, 31.1902],
      [121.4588, 31.1927],
      [121.458, 31.1952],
      [121.4572, 31.1978],
      [121.4564, 31.2002],
      [121.4556, 31.2028],
      [121.4535, 31.203],
      [121.452, 31.201],
      [121.453, 31.198],
      [121.4542, 31.1955],
      [121.4555, 31.1928],
      [121.4568, 31.19],
      [121.458, 31.1875],
      [121.4602, 31.185],
    ],
  },
];

/** Tokyo markers — all English. */
export const tokyoMarkers: MarkerSpec[] = [
  {
    lng: 139.6917,
    lat: 35.6895,
    label: "Tokyo Station",
    color: "#e11d48",
    emoji: "🚉",
    popupContent: popup("Tokyo Station", "1 Chome Marunouchi, Chiyoda", 4.6, "24 hours", ["JR", "Shinkansen", "Subway"]),
  },
  {
    lng: 139.767,
    lat: 35.6812,
    label: "Senso-ji",
    color: "#f59e0b",
    emoji: "⛩️",
    popupContent: popup("Senso-ji", "2-3-1 Asakusa, Taito", 4.8, "06:00 - 17:00", ["temple", "tourism"]),
  },
  {
    lng: 139.7003,
    lat: 35.6586,
    label: "Shibuya Crossing",
    color: "#10b981",
    emoji: "🚦",
    popupContent: popup("Shibuya Crossing", "1 Chome Dogenzaka, Shibuya", 4.4, "always", ["crossing", "shopping"]),
  },
];

/** Tokyo track — Imperial Palace loop. */
export const tokyoTracks: TrackSpec[] = [
  {
    name: "Imperial Palace Run",
    color: "#2563eb",
    coordinates: [
      [139.7528, 35.6852],
      [139.7565, 35.6885],
      [139.7602, 35.6918],
      [139.7638, 35.6948],
      [139.7672, 35.6942],
      [139.7702, 35.6912],
      [139.7702, 35.6878],
      [139.7678, 35.6848],
      [139.7642, 35.6832],
      [139.7602, 35.6832],
      [139.7568, 35.6838],
      [139.7528, 35.6852],
    ],
  },
];
