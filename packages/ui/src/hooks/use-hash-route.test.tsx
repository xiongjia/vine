// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHashRoute } from "./use-hash-route";

describe("useHashRoute", () => {
  it("defaults to the default slug when no hash", () => {
    window.location.hash = "";
    const { result } = renderHook(() => useHashRoute("overview"));
    expect(result.current[0]).toBe("overview");
  });

  it("reads the current hash", () => {
    window.location.hash = "#/map";
    const { result } = renderHook(() => useHashRoute("overview"));
    expect(result.current[0]).toBe("map");
  });

  it("navigate updates the hash and the slug", async () => {
    window.location.hash = "";
    const { result } = renderHook(() => useHashRoute("overview"));
    act(() => result.current[1]("button"));
    expect(window.location.hash).toBe("#/button");
    // jsdom dispatches hashchange asynchronously — wait for the hook to catch up
    await waitFor(() => expect(result.current[0]).toBe("button"));
  });

  it("updates the slug on hashchange", () => {
    window.location.hash = "#/overview";
    const { result } = renderHook(() => useHashRoute("overview"));
    act(() => {
      window.location.hash = "#/card";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(result.current[0]).toBe("card");
  });
});
