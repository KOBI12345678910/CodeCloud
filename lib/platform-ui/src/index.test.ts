import { describe, expect, it } from "vitest";
import { cn, theme } from "./index.js";

describe("@platform/ui", () => {
  it("cn merges tailwind classes correctly", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });

  it("exposes a theme", () => {
    expect(theme.colors.accent).toMatch(/hsl/);
  });
});
