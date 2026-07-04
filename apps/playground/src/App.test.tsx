import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@vine/ui";

vi.mock("./pages/overview.mdx", () => ({
  default: () => "Overview",
  frontmatter: { title: "Overview", description: "Component overview" },
}));
vi.mock("./pages/button.mdx", () => ({
  default: () => "Button",
  frontmatter: { title: "Button", description: "Button component" },
}));
vi.mock("./pages/card.mdx", () => ({
  default: () => "Card",
  frontmatter: { title: "Card", description: "Card component" },
}));
vi.mock("./pages/checkbox.mdx", () => ({
  default: () => "Checkbox",
  frontmatter: { title: "Checkbox", description: "Checkbox component" },
}));
vi.mock("./pages/dialog.mdx", () => ({
  default: () => "Dialog",
  frontmatter: { title: "Dialog", description: "Dialog component" },
}));
vi.mock("./pages/map.mdx", () => ({
  default: () => "Map",
  frontmatter: { title: "Map", description: "Map component" },
}));
vi.mock("./pages/sheet.mdx", () => ({
  default: () => "Sheet",
  frontmatter: { title: "Sheet", description: "Sheet component" },
}));

import App from "./App";

describe("App", () => {
  it("renders without crashing", () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );
    expect(screen.getByText("Vine UI")).toBeDefined();
  });
});
