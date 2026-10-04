import { describe, it, expect } from "vitest";
import { formatCurrency, formatPercent, cn } from "./utils";

describe("Utils tests", () => {
  it("formats positive and negative currency amounts correctly in EUR", () => {
    const formatted = formatCurrency(1234.56, "EUR");
    expect(formatted).toContain("1,234.56");
  });

  it("formats positive percentages with leading plus sign", () => {
    expect(formatPercent(5.234)).toBe("+5.23%");
  });

  it("formats negative percentages with negative sign", () => {
    expect(formatPercent(-3.14)).toBe("-3.14%");
  });

  it("merges class names correctly", () => {
    expect(cn("px-2", "py-1", "bg-white")).toBe("px-2 py-1 bg-white");
  });
});
