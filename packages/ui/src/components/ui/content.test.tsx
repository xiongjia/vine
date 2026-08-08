// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Content } from "./content";

describe("Content", () => {
  it("renders children inside the prose container", () => {
    render(<Content>Hello</Content>);
    expect(screen.getByText("Hello").className).toContain("prose");
  });

  it("merges className onto the outer wrapper", () => {
    const { container } = render(<Content className="extra">x</Content>);
    // getByText resolves to the inner prose div; the merged class is on the outer one
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain("extra");
    expect(outer.className).toContain("flex-1");
  });
});
