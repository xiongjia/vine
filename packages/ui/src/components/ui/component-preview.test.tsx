// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./code-block", () => ({
  CodeBlock: () => <div data-testid="code-block" />,
}));

import { ComponentPreview } from "./component-preview";

describe("ComponentPreview", () => {
  it("renders children and no code block by default", () => {
    render(<ComponentPreview>preview content</ComponentPreview>);
    expect(screen.getByText("preview content")).toBeDefined();
    expect(screen.queryByTestId("code-block")).toBeNull();
  });

  it("renders the code block when code is provided", () => {
    render(<ComponentPreview code="<Button />">preview</ComponentPreview>);
    expect(screen.getByTestId("code-block")).toBeDefined();
    expect(screen.getByText("preview")).toBeDefined();
  });
});
