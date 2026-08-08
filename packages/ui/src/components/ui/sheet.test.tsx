// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

describe("Sheet", () => {
  it("opens and closes the sheet", () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Panel</SheetTitle>
            <SheetDescription>Slide-over</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.queryByText("Panel")).toBeNull();
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Panel")).toBeDefined();
    expect(screen.getByText("Slide-over")).toBeDefined();
  });
});
