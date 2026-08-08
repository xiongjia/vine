import type { MarkerSpec, TrackSpec } from "./map/specs";

/** Build a richer popup body (inline styles — injected as raw HTML). */
function coffeePopup(
  name: string,
  address: string,
  rating: number,
  hours: string,
  tags: string[],
  badge = "营业中",
): string {
  const stars = "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  return `
    <div style="min-width:230px;font-family:system-ui,sans-serif;font-size:13px;color:#0f172a">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:15px;font-weight:700">${name}</span>
        <span style="font-size:11px;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:1px 6px">${badge}</span>
      </div>
      <div style="color:#475569;margin-bottom:4px">📍 ${address}</div>
      <div style="color:#f59e0b;margin-bottom:4px;letter-spacing:1px">${stars} <span style="color:#64748b;letter-spacing:0">${rating.toFixed(1)}</span></div>
      <div style="color:#475569;margin-bottom:8px">🕐 ${hours}</div>
      <div>${tags.map((t) => `<span style="display:inline-block;background:#f1f5f9;color:#475569;border-radius:4px;padding:1px 7px;margin:0 4px 4px 0;font-size:12px">${t}</span>`).join(", ")}</div>
    </div>`;
}

/** Shanghai demo markers (adapted from the prototype sample-data for Shanghai locations). */
export const shanghaiMarkers: MarkerSpec[] = [
  {
    lng: 121.47,
    lat: 31.23,
    label: "Coffee A",
    color: "#e11d48",
    emoji: "☕",
    popupContent: coffeePopup(
      "Coffee A",
      "100 Binjiang Rd, Xuhui",
      4.7,
      "08:00 - 22:00 daily",
      ["pour-over", "Wi-Fi", "pet friendly"],
      "Open",
    ),
  },
  {
    lng: 121.49,
    lat: 31.21,
    label: "咖啡B",
    color: "#f59e0b",
    emoji: "🧋",
    popupContent: coffeePopup(
      "咖啡B",
      "黄浦区南京东路 50 号 2F",
      4.5,
      "周一至周五 07:30 - 20:00 · 周末 09:00 - 21:00",
      ["澳白", "外带", "可充电"],
    ),
  },
  {
    lng: 121.44,
    lat: 31.26,
    label: "咖啡C",
    color: "#10b981",
    emoji: "🍵",
    popupContent: coffeePopup("咖啡C", "静安区愚园路 218 号", 4.9, "周一至周日 09:00 - 23:00", [
      "特调",
      "精酿",
      "安静",
    ]),
  },
];

/** Shanghai riverside loop track (adapted from the prototype sample-data). */
export const shanghaiTracks: TrackSpec[] = [
  {
    name: "徐汇滨江",
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

/** Tokyo demo markers (adapted from the prototype sample-data structure). */
export const tokyoMarkers: MarkerSpec[] = [
  {
    lng: 139.6917,
    lat: 35.6895,
    label: "東京駅",
    color: "#e11d48",
    emoji: "🚉",
    popupContent: coffeePopup("東京駅", "千代田区丸の内 1 丁目", 4.6, "24 時間", ["JR", "新幹線", "地下鉄"]),
  },
  {
    lng: 139.767,
    lat: 35.6812,
    label: "浅草寺",
    color: "#f59e0b",
    emoji: "⛩️",
    popupContent: coffeePopup("浅草寺", "台東区浅草 2 丁目 3-1", 4.8, "06:00 - 17:00", ["寺社", "観光"]),
  },
  {
    lng: 139.7003,
    lat: 35.6586,
    label: "渋谷",
    color: "#10b981",
    emoji: "🚦",
    popupContent: coffeePopup("渋谷スクランブル交差点", "渋谷区道玄坂 1 丁目", 4.4, "終日", ["交差点", "ショッピング"]),
  },
];

/** Tokyo demo track (around the Imperial Palace). */
export const tokyoTracks: TrackSpec[] = [
  {
    name: "皇居ラン",
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
