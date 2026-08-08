// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Input } from "./input";

describe("Input", () => {
  it("renders an input and forwards value/onChange", () => {
    let value = "";
    render(<Input aria-label="search" value={value} onChange={(e) => (value = e.target.value)} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "abc" } });
    expect(value).toBe("abc");
  });

  it("applies the type prop", () => {
    render(<Input type="number" aria-label="n" />);
    expect(screen.getByRole("spinbutton")).toBeDefined();
  });
});
