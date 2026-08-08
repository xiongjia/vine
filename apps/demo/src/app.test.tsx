import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";

vi.mock("@vine/ui", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  MapView: () => <div data-testid="map" />,
  CodeBlock: () => <div data-testid="code" />,
  CodeToggle: () => <div data-testid="code-toggle" />,
  GithubIcon: () => <div data-testid="github-icon" />,
  shanghaiMarkers: [],
  shanghaiTracks: [],
  tokyoMarkers: [],
  tokyoTracks: [],
}));

import App from "./app";

describe("App", () => {
  it("renders the header and showcase sections", () => {
    render(<App />);
    expect(screen.getByText("Vine Maps Demo")).toBeDefined();
    expect(screen.getByText("上海 · Shanghai")).toBeDefined();
    expect(screen.getByText("东京 · Tokyo")).toBeDefined();
    expect(screen.getByText("Styles")).toBeDefined();
    expect(screen.getAllByTestId("map").length).toBeGreaterThanOrEqual(3);
  });

  it("renders a code toggle per example", () => {
    render(<App />);
    // CodeToggle behavior is owned by @vine/ui; the demo only mounts it
    expect(screen.getAllByTestId("code-toggle").length).toBeGreaterThanOrEqual(3);
  });
});
