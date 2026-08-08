import { describe, expect, it } from "vitest";
import { REGION_PRESETS, listRegionNames, resolveBbox } from "./presets";

describe("region presets", () => {
  it("shanghai and tokyo exist (first two test regions)", () => {
    expect(listRegionNames()).toEqual(
      expect.arrayContaining(["shanghai", "tokyo"]),
    );
  });

  it("every preset bbox is sane (min < max, valid lng/lat ranges)", () => {
    for (const [name, p] of Object.entries(REGION_PRESETS)) {
      const [minLng, minLat, maxLng, maxLat] = p.bbox;
      expect(minLng, name).toBeLessThan(maxLng);
      expect(minLat, name).toBeLessThan(maxLat);
      expect(minLng, name).toBeGreaterThanOrEqual(-180);
      expect(maxLng, name).toBeLessThanOrEqual(180);
      expect(minLat, name).toBeGreaterThanOrEqual(-90);
      expect(maxLat, name).toBeLessThanOrEqual(90);
      expect(p.defaultMaxZoom, name).toBeGreaterThan(0);
    }
  });

  it("resolveBbox prefers the explicit bbox argument", () => {
    expect(resolveBbox("shanghai", "1,2,3,4")).toEqual([1, 2, 3, 4]);
    expect(resolveBbox("shanghai")).toEqual(REGION_PRESETS.shanghai.bbox);
  });

  it("resolveBbox rejects malformed bbox and unknown regions", () => {
    expect(() => resolveBbox("shanghai", "1,2,3")).toThrow();
    expect(() => resolveBbox("shanghai", "a,b,c,d")).toThrow();
    expect(() => resolveBbox("nowhere")).toThrow(/unknown region/);
  });
});
