// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider, ThemeToggle, useTheme } from "./theme-toggle";

const Probe = () => {
  const { isDark } = useTheme();
  return <span data-testid="probe">{isDark ? "dark" : "light"}</span>;
};

describe("theme-toggle", () => {
  it("defaults to light and toggles to dark", () => {
    render(
      <ThemeProvider>
        <Probe />
        <ThemeToggle aria-label="theme" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("light");
    fireEvent.click(screen.getByLabelText("theme"));
    expect(screen.getByTestId("probe").textContent).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("reads the initial theme from localStorage", () => {
    localStorage.setItem("theme", "dark");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("dark");
  });
});
