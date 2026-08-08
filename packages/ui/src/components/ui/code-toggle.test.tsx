// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("./code-block", () => ({
  CodeBlock: () => <div data-testid="code-block" />,
}));

import { CodeToggle } from "./code-toggle";

describe("CodeToggle", () => {
  it("starts collapsed and expands/collapses on click", () => {
    render(<CodeToggle code="<MapView />" />);
    expect(screen.queryByTestId("code-block")).toBeNull();

    fireEvent.click(screen.getByText("View code"));
    expect(screen.getByTestId("code-block")).toBeDefined();

    fireEvent.click(screen.getByText("Hide code"));
    expect(screen.queryByTestId("code-block")).toBeNull();
  });
});
