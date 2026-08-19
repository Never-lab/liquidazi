/** Minimum buy order (€). */
export const PORTFOLIO_MIN_BUY = 100;

/** Migration targets for legacy save conversion. */
export const PORTFOLIO_LIQUID_SYMBOL = "XEON.MI";
export const PORTFOLIO_LIQUID_LABEL = "iShares EUR Cash (liquidità)";
export const PORTFOLIO_GROWTH_SYMBOL = "SWDA.MI";
export const PORTFOLIO_GROWTH_LABEL = "iShares MSCI World (crescita)";

/** Fallback €/share when migrating without a live quote. */
export const PORTFOLIO_MIGRATION_FALLBACK_PRICE = 100;

/** Monthly operation slots scale with company age. */
export const maxPortfolioOps = (monthsPlayed: number): number => {
  if (monthsPlayed < 12) return 2;
  if (monthsPlayed < 36) return 5;
  return 8;
};

export type PortfolioAssetClass = "equity" | "bond" | "etf" | "fund" | "other";

export const inferAssetClass = (quoteType?: string): PortfolioAssetClass => {
  const t = (quoteType ?? "").toUpperCase();
  if (t.includes("ETF")) return "etf";
  if (t.includes("MUTUALFUND") || t.includes("FUND")) return "fund";
  if (t.includes("EQUITY")) return "equity";
  if (t.includes("BOND") || t.includes("INDEX")) return "bond";
  return "other";
};
