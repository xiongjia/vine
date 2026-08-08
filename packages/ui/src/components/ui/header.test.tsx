// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./header";

describe("Header", () => {
  it("renders the title", () => {
    render(<Header title="My Header" />);
    expect(screen.getByText("My Header").tagName).toBe("H1");
  });

  it("renders start / children / end slots", () => {
    render(
      <Header title="T" start={<span>start</span>} end={<span>end</span>}>
        <span>middle</span>
      </Header>,
    );
    expect(screen.getByText("start")).toBeDefined();
    expect(screen.getByText("middle")).toBeDefined();
    expect(screen.getByText("end")).toBeDefined();
  });
});
