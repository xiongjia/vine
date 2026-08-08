// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarAside, SidebarProvider } from "./sidebar";

describe("Sidebar", () => {
  it("renders children inside the provider + aside", () => {
    render(
      <SidebarProvider>
        <SidebarAside>
          <span>nav item</span>
        </SidebarAside>
      </SidebarProvider>,
    );
    expect(screen.getByText("nav item")).toBeDefined();
    expect(screen.getByRole("complementary")).toBeDefined();
  });
});
