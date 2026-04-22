import { describe, expect, it } from "vitest";
import {
  LOCALES,
  formatCurrency,
  formatDate,
  formatMessage,
  formatNumber,
  isRtl,
  resolveLocale,
} from "./index.js";

describe("@platform/i18n", () => {
  it("includes en, es, ja, ar (RTL)", () => {
    const codes = LOCALES.map((l) => l.code).sort();
    expect(codes).toEqual(["ar", "en", "es", "ja"]);
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("en")).toBe(false);
  });

  it("resolves locales with regional fallback", () => {
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("xx")).toBe("en");
    expect(resolveLocale(undefined)).toBe("en");
  });

  it("formats ICU plurals", () => {
    const msg = "{count, plural, =0 {No items} one {# item} other {# items}}";
    expect(formatMessage(msg, { count: 0 }, "en")).toBe("No items");
    expect(formatMessage(msg, { count: 1 }, "en")).toBe("1 item");
    expect(formatMessage(msg, { count: 5 }, "en")).toBe("5 items");
  });

  it("formats numbers, dates, currencies per locale", () => {
    expect(formatNumber(1234.5, "en")).toBe("1,234.5");
    expect(formatCurrency(9.99, "USD", "en")).toBe("$9.99");
    expect(formatDate(new Date("2024-01-15T00:00:00Z"), "en", { dateStyle: "short" })).toMatch(
      /\d/,
    );
  });
});
