import { describe, expect, it } from "vitest";
import {
  shanghaiMarkers,
  shanghaiTracks,
  tokyoMarkers,
  tokyoTracks,
} from "./sample-data";

describe("sample data", () => {
  it("markers have valid coordinates and required fields", () => {
    for (const m of [...shanghaiMarkers, ...tokyoMarkers]) {
      expect(typeof m.lng).toBe("number");
      expect(typeof m.lat).toBe("number");
      expect(m.lng).toBeGreaterThanOrEqual(-180);
      expect(m.lng).toBeLessThanOrEqual(180);
      expect(m.lat).toBeGreaterThanOrEqual(-90);
      expect(m.lat).toBeLessThanOrEqual(90);
    }
  });

  it("tracks have names, colors and coordinate rings", () => {
    for (const t of [...shanghaiTracks, ...tokyoTracks]) {
      expect(typeof t.name).toBe("string");
      expect(t.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(t.coordinates.length).toBeGreaterThan(2);
      expect(t.coordinates[0]).toHaveLength(2);
    }
  });
});
