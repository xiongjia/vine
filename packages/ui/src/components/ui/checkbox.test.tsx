// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("toggles checked state on click", () => {
    render(<Checkbox aria-label="agree" />);
    const box = screen.getByRole("checkbox");
    expect(box.getAttribute("data-state")).toBe("unchecked");
    fireEvent.click(box);
    expect(box.getAttribute("data-state")).toBe("checked");
    fireEvent.click(box);
    expect(box.getAttribute("data-state")).toBe("unchecked");
  });

  it("is disabled and does not toggle", () => {
    render(<Checkbox aria-label="no" disabled />);
    const box = screen.getByRole("checkbox");
    expect(box).toHaveProperty("disabled", true);
    fireEvent.click(box);
    expect(box.getAttribute("data-state")).toBe("unchecked");
  });
});
