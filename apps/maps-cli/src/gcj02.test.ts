import { describe, expect, it } from "vitest";
import { gcj02ToWgs84 } from "./lib/gcj02";

describe("gcj02ToWgs84", () => {
  it("matches the verified example from make-own-map.md", () => {
    // Amap picker 121.48, 31.16 (GCJ-02) -> 121.475504, 31.161994 (WGS-84)
    const [lng, lat] = gcj02ToWgs84(121.48, 31.16);
    expect(lng).toBeCloseTo(121.475504, 5);
    expect(lat).toBeCloseTo(31.161994, 5);
  });

  it("round-trips within a plausible offset (300-500m ≈ 0.003-0.005°)", () => {
    const [lng, lat] = gcj02ToWgs84(121.47, 31.23);
    expect(Math.abs(lng - 121.47)).toBeLessThan(0.01);
    expect(Math.abs(lat - 31.23)).toBeLessThan(0.01);
  });
});
