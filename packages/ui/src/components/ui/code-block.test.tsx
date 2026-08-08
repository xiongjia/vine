// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./highlight-code", () => ({
  highlightCode: vi.fn(async (code: string) => `<code>${code}</code>`),
}));
vi.mock("./theme-toggle", () => ({
  useTheme: () => ({ isDark: false }),
}));

import { CodeBlock } from "./code-block";

describe("CodeBlock", () => {
  it("renders the highlighted code and title", async () => {
    render(<CodeBlock code="<MapView />" title="Example" />);
    expect(screen.getByText("Example")).toBeDefined();
    expect(await screen.findByText("<MapView />")).toBeDefined();
  });

  it("falls back to a plain <pre> while highlighting", () => {
    render(<CodeBlock code="const a = 1" />);
    // highlight is async; the initial fallback pre shows the raw code
    expect(screen.getByText("const a = 1")).toBeDefined();
  });
});
