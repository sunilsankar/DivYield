import { afterEach, describe, it, expect } from "vitest";
import { cn, currencySymbol, formatCurrency, formatPercent, getDisplayCurrency, setDisplayCurrency } from "./utils";

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

describe("display currency", () => {
  afterEach(() => setDisplayCurrency("EUR"));

  it("formats amounts without an explicit currency in the account currency", () => {
    expect(formatCurrency(1234.5)).toContain("€");
    setDisplayCurrency("gbp");
    expect(getDisplayCurrency()).toBe("GBP");
    expect(formatCurrency(1234.5)).toBe("£1,234.50");
    expect(formatCurrency(10, "USD")).toContain("$");
  });

  it("gives the symbol for the current currency and ignores invalid codes", () => {
    setDisplayCurrency("GBP");
    expect(currencySymbol()).toBe("£");
    setDisplayCurrency(undefined);
    setDisplayCurrency("pounds");
    expect(getDisplayCurrency()).toBe("GBP");
  });
});
