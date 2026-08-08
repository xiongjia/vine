import { describe, expect, it } from "vitest";
import { highlightCode } from "./highlight-code";

describe("highlightCode", () => {
  it("returns an html string containing the code", async () => {
    const html = await highlightCode("const a = 1", "ts", false);
    expect(typeof html).toBe("string");
    expect(html).toContain("const");
  });

  it("switches theme with isDark", async () => {
    const light = await highlightCode("<div />", "tsx", false);
    const dark = await highlightCode("<div />", "tsx", true);
    expect(light).not.toEqual(dark);
  });
});
