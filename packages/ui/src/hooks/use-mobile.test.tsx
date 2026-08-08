// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MobileOverrideProvider, useIsMobile } from "./use-mobile";

const wrapper =
  (forceMobile: boolean | null) =>
  ({ children }: { children: React.ReactNode }) =>
    <MobileOverrideProvider forceMobile={forceMobile}>{children}</MobileOverrideProvider>;

describe("useIsMobile", () => {
  it("respects the mobile override (true)", () => {
    const { result } = renderHook(() => useIsMobile(), { wrapper: wrapper(true) });
    expect(result.current).toBe(true);
  });

  it("respects the mobile override (false)", () => {
    const { result } = renderHook(() => useIsMobile(), { wrapper: wrapper(false) });
    expect(result.current).toBe(false);
  });
});
