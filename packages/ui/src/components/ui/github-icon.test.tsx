// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { GithubIcon } from "./github-icon";

describe("GithubIcon", () => {
  it("renders an inline svg with currentColor fill", () => {
    const { container } = render(<GithubIcon />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("fill")).toBe("currentColor");
  });

  it("accepts a className", () => {
    const { container } = render(<GithubIcon className="w-4 h-4" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("w-4 h-4");
  });
});
