import {
  PORTFOLIO_GROWTH_LABEL,
  PORTFOLIO_GROWTH_SYMBOL,
  PORTFOLIO_LIQUID_LABEL,
  PORTFOLIO_LIQUID_SYMBOL,
  PORTFOLIO_MIGRATION_FALLBACK_PRICE,
} from "../config/portfolio";
import type { PortfolioPosition } from "./types";
import { round2, type GameState } from "./types";

const addMigratedPosition = (
  positions: PortfolioPosition[],
  pos: PortfolioPosition,
): PortfolioPosition[] => {
  const idx = positions.findIndex(
    (p) => p.symbol.toUpperCase() === pos.symbol.toUpperCase(),
  );
  if (idx < 0) return [...positions, pos];
  const cur = positions[idx]!;
  const totalShares = round2(cur.shares + pos.shares);
  const totalCost = round2(cur.avgCostEur * cur.shares + pos.avgCostEur * pos.shares);
  const out = [...positions];
  out[idx] = {
    ...cur,
    shares: totalShares,
    avgCostEur: round2(totalCost / totalShares),
    liquid: cur.liquid || pos.liquid,
  };
  return out;
};

/** One-time conversion from treasury / growth / annual project → market portfolio. */
export const migratePortfolioLegacy = (state: GameState): GameState => {
  if (state.portfolioLegacyMigrated) return state;

  const next = structuredClone(state);
  let positions: PortfolioPosition[] = [...(next.portfolio ?? [])];
  const price = PORTFOLIO_MIGRATION_FALLBACK_PRICE;

  const treasury = next.treasury ?? 0;
  if (treasury > 0) {
    positions = addMigratedPosition(positions, {
      symbol: PORTFOLIO_LIQUID_SYMBOL,
      label: PORTFOLIO_LIQUID_LABEL,
      shares: round2(treasury / price),
      avgCostEur: price,
      assetClass: "etf",
      liquid: true,
      lastPriceEur: price,
    });
    next.treasury = 0;
  }

  const growth = next.growthInvested ?? 0;
  if (growth > 0) {
    positions = addMigratedPosition(positions, {
      symbol: PORTFOLIO_GROWTH_SYMBOL,
      label: PORTFOLIO_GROWTH_LABEL,
      shares: round2(growth / price),
      avgCostEur: price,
      assetClass: "etf",
      lastPriceEur: price,
    });
    next.growthInvested = 0;
  }

  if (next.activeProject) {
    const refund = round2(next.activeProject.frozenCash ?? 0);
    if (refund > 0) {
      next.company.cash = round2(next.company.cash + refund);
    }
    next.activeProject = null;
  }
  next.projectOffer = null;

  next.portfolio = positions;
  next.portfolioOpsUsedThisMonth ??= 0;
  next.portfolioHistory ??= [];
  next.portfolioLegacyMigrated = true;
  return next;
};
