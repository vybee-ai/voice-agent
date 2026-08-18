// Central, single source of truth for market defaults.
// Nothing in the UI should hardcode "Dubai", "AED", or "+971" directly —
// components should read from this config so a future market can be added
// without touching every screen.

export interface MarketConfig {
  country: string;
  city: string;
  currency: string;
  phoneCountryCode: string;
  timezone: string;
}

export const marketConfig: MarketConfig = {
  country: process.env.MARKET_COUNTRY || "United Arab Emirates",
  city: process.env.MARKET_CITY || "Dubai",
  currency: process.env.MARKET_CURRENCY || "AED",
  phoneCountryCode: process.env.MARKET_PHONE_CODE || "+971",
  timezone: process.env.MARKET_TIMEZONE || "Asia/Dubai",
};

export function formatCurrency(amount: number | null | undefined, currency?: string | null): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "Not provided";
  const curr = currency || marketConfig.currency;
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `${curr} ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    const k = amount / 1_000;
    return `${curr} ${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `${curr} ${amount.toLocaleString()}`;
}

export function formatBudgetRange(min?: number | null, max?: number | null, currency?: string | null): string {
  if (!min && !max) return "Not provided";
  if (min && max) return `${formatCurrency(min, currency)} – ${formatCurrency(max, currency)}`;
  return formatCurrency(min || max, currency);
}
