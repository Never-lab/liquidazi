import {
  inferAssetClass,
  maxPortfolioOps,
  PORTFOLIO_MIN_BUY,
  type PortfolioAssetClass,
} from "../config/portfolio";
import { round2, type GameState, type PortfolioPosition } from "./types";

export type { PortfolioPosition };

export const portfolioPositions = (state: GameState): PortfolioPosition[] =>
  state.portfolio ?? [];

export const portfolioOpsRemaining = (state: GameState): number =>
  Math.max(0, maxPortfolioOps(state.monthsPlayed) - (state.portfolioOpsUsedThisMonth ?? 0));

export const positionMarketValue = (p: PortfolioPosition): number =>
  round2(p.shares * (p.lastPriceEur ?? p.avgCostEur));

export const portfolioTotalValue = (state: GameState): number =>
  round2(portfolioPositions(state).reduce((s, p) => s + positionMarketValue(p), 0));

export const liquidPortfolioValue = (state: GameState): number =>
  round2(
    portfolioPositions(state)
      .filter((p) => p.liquid)
      .reduce((s, p) => s + positionMarketValue(p), 0),
  );

const canUseOp = (state: GameState): boolean => portfolioOpsRemaining(state) > 0;

const mergePosition = (
  positions: PortfolioPosition[],
  incoming: PortfolioPosition,
): PortfolioPosition[] => {
  const idx = positions.findIndex(
    (p) => p.symbol.toUpperCase() === incoming.symbol.toUpperCase(),
  );
  if (idx < 0) return [...positions, incoming];
  const cur = positions[idx]!;
  const totalShares = round2(cur.shares + incoming.shares);
  const totalCost = round2(cur.avgCostEur * cur.shares + incoming.avgCostEur * incoming.shares);
  const next: PortfolioPosition = {
    ...cur,
    label: incoming.label || cur.label,
    shares: totalShares,
    avgCostEur: round2(totalCost / totalShares),
    lastPriceEur: incoming.lastPriceEur ?? cur.lastPriceEur,
    liquid: cur.liquid || incoming.liquid,
  };
  const out = [...positions];
  out[idx] = next;
  return out;
};

export const buyPortfolio = (
  state: GameState,
  opts: {
    symbol: string;
    label: string;
    amountEur: number;
    priceEur: number;
    assetClass?: PortfolioAssetClass;
    quoteType?: string;
    liquid?: boolean;
  },
): GameState => {
  const amt = round2(opts.amountEur);
  const price = round2(opts.priceEur);
  if (!(amt >= PORTFOLIO_MIN_BUY) || !(price > 0) || state.company.cash < amt) return state;
  if (!canUseOp(state)) return state;

  const shares = round2(amt / price);
  if (!(shares > 0)) return state;

  const next = structuredClone(state);
  const pos: PortfolioPosition = {
    symbol: opts.symbol.toUpperCase(),
    label: opts.label,
    shares,
    avgCostEur: price,
    assetClass: opts.assetClass ?? inferAssetClass(opts.quoteType),
    liquid: opts.liquid,
    lastPriceEur: price,
  };
  next.portfolio = mergePosition(next.portfolio ?? [], pos);
  next.company.cash = round2(next.company.cash - amt);
  next.portfolioOpsUsedThisMonth = (next.portfolioOpsUsedThisMonth ?? 0) + 1;
  next.log.unshift({
    id: next.nextId++,
    monthIdx: state.calendar.year * 12 + (state.calendar.month - 1),
    tone: "neutral",
    text: `Portafoglio: acquisto ${pos.symbol} −${amt.toLocaleString("it-IT")} €.`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};

export const sellPortfolio = (
  state: GameState,
  symbol: string,
  sharesToSell: number,
  priceEur: number,
): GameState => {
  const price = round2(priceEur);
  const sellShares = round2(sharesToSell);
  if (!(price > 0) || !(sellShares > 0)) return state;
  if (!canUseOp(state)) return state;

  const positions = portfolioPositions(state);
  const idx = positions.findIndex((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
  if (idx < 0) return state;
  const cur = positions[idx]!;
  if (sellShares > cur.shares + 1e-6) return state;

  const proceeds = round2(sellShares * price);
  const costBasis = round2(sellShares * cur.avgCostEur);
  const gain = round2(proceeds - costBasis);

  const next = structuredClone(state);
  const remaining = round2(cur.shares - sellShares);
  const updated = [...(next.portfolio ?? [])];
  if (remaining <= 0.0001) {
    updated.splice(idx, 1);
  } else {
    updated[idx] = {
      ...cur,
      shares: remaining,
      lastPriceEur: price,
    };
  }
  next.portfolio = updated;
  next.company.cash = round2(next.company.cash + proceeds);
  if (gain > 0) {
    next.ytd.capitalGains = round2(next.ytd.capitalGains + gain);
  }
  next.portfolioOpsUsedThisMonth = (next.portfolioOpsUsedThisMonth ?? 0) + 1;
  const gainNote =
    gain > 0 ? ` · plusvalenza ${gain.toLocaleString("it-IT")} €` : "";
  next.log.unshift({
    id: next.nextId++,
    monthIdx: state.calendar.year * 12 + (state.calendar.month - 1),
    tone: gain > 0 ? "good" : "neutral",
    text: `Portafoglio: vendita ${cur.symbol} +${proceeds.toLocaleString("it-IT")} €${gainNote}.`,
  });
  next.log = next.log.slice(0, 12);
  return next;
};

/** Reduce liquid positions (no cash credit — enforcement / tax drain). */
export const drainPortfolioLiquid = (state: GameState, amount: number): number => {
  if (amount <= 0) return 0;
  state.portfolio ??= [];
  let remaining = round2(amount);
  let taken = 0;

  for (const pos of state.portfolio.filter((p) => p.liquid)) {
    if (remaining <= 0) break;
    const price = pos.lastPriceEur ?? pos.avgCostEur;
    const value = round2(pos.shares * price);
    if (value <= 0) continue;
    const sellValue = round2(Math.min(value, remaining));
    const sellShares = sellValue / price;
    pos.shares = round2(Math.max(0, pos.shares - sellShares));
    taken = round2(taken + sellValue);
    remaining = round2(remaining - sellValue);
  }
  state.portfolio = state.portfolio.filter((p) => p.shares > 0.0001);
  return taken;
};

/** Liquidate liquid positions into company cash (negative cash cover). */
export const coverNegativeCashFromPortfolio = (state: GameState): number => {
  if (state.company.cash >= 0) return 0;
  const need = round2(-state.company.cash);
  const taken = drainPortfolioLiquid(state, need);
  if (taken > 0) {
    state.company.cash = round2(state.company.cash + taken);
    state.log.unshift({
      id: state.nextId++,
      monthIdx: state.calendar.year * 12 + (state.calendar.month - 1),
      tone: "neutral",
      text: `Liquidità portafoglio: −${taken.toLocaleString("it-IT")} € per coprire la cassa.`,
    });
    state.log = state.log.slice(0, 12);
  }
  return taken;
};

/** Drains cash first, then liquid portfolio holdings. */
export const drainCashThenPortfolioLiquid = (state: GameState, amount: number): number => {
  if (amount <= 0) return 0;
  let taken = 0;
  let remaining = round2(amount);
  const fromCash = round2(Math.min(state.company.cash, remaining));
  state.company.cash = round2(state.company.cash - fromCash);
  taken = round2(taken + fromCash);
  remaining = round2(remaining - fromCash);
  if (remaining > 0) {
    taken = round2(taken + drainPortfolioLiquid(state, remaining));
  }
  return taken;
};

export const portfolioInvestedCost = (state: GameState): number =>
  round2(
    portfolioPositions(state).reduce((s, p) => s + round2(p.shares * p.avgCostEur), 0),
  );

export const availablePortfolioForEnforcement = (state: GameState): number =>
  round2(Math.max(0, state.company.cash) + liquidPortfolioValue(state));
