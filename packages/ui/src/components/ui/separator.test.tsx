// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Separator } from "./separator";

describe("Separator", () => {
  it("renders a divider", () => {
    const { container } = render(<Separator />);
    expect(container.querySelector("[data-orientation]")).not.toBeNull();
  });

  it("honors the orientation prop", () => {
    const { container } = render(<Separator orientation="vertical" />);
    expect(container.querySelector('[data-orientation="vertical"]')).not.toBeNull();
  });
});
