import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency used when a caller doesn't pass one: the account currency, set by
// App from the portfolio summary. Defaults to EUR until that loads.
let displayCurrency = "EUR";

export function setDisplayCurrency(currency?: string | null): void {
  if (currency && /^[A-Za-z]{3}$/.test(currency)) displayCurrency = currency.toUpperCase();
}

export function getDisplayCurrency(): string {
  return displayCurrency;
}

export function currencySymbol(currency: string = displayCurrency): string {
  const part = new Intl.NumberFormat("en-IE", { style: "currency", currency })
    .formatToParts(0)
    .find((p) => p.type === "currency");
  return part?.value ?? currency;
}

export function formatCurrency(amount: number, currency: string = displayCurrency): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
