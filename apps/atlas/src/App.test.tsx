import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@vine/ui";

vi.mock("maplibre-gl", () => ({
  default: {
    Map: vi.fn().mockImplementation(() => ({
      addControl: vi.fn(),
      remove: vi.fn(),
    })),
    NavigationControl: vi.fn(),
    Marker: vi.fn().mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
  },
}));

import App from "./App";

describe("App", () => {
  it("renders without crashing", () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );
    expect(screen.getByText("Atlas")).toBeDefined();
  });
});
