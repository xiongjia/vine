// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

describe("Tooltip", () => {
  it("shows the tooltip content on hover", async () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.queryByText("Tooltip text")).toBeNull();
    // radix tooltip opens on focus/pointer; jsdom responds to focus
    fireEvent.focus(screen.getByText("Hover me"));
    // radix may keep an animating copy in the DOM — assert at least one is visible
    await waitFor(() =>
      expect(screen.getAllByText("Tooltip text").length).toBeGreaterThan(0),
    );
  });
});
