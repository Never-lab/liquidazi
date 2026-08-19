import { describe, expect, it } from "vitest";
import { maxPortfolioOps } from "../config/portfolio";
import { migratePortfolioLegacy } from "./migratePortfolio";
import {
  buyPortfolio,
  coverNegativeCashFromPortfolio,
  drainCashThenPortfolioLiquid,
  portfolioOpsRemaining,
  portfolioTotalValue,
  sellPortfolio,
} from "./portfolio";
import { createInitialGameState } from "./types";

describe("portfolio", () => {
  it("maxPortfolioOps scales 2 → 5 → 8", () => {
    expect(maxPortfolioOps(0)).toBe(2);
    expect(maxPortfolioOps(11)).toBe(2);
    expect(maxPortfolioOps(12)).toBe(5);
    expect(maxPortfolioOps(35)).toBe(5);
    expect(maxPortfolioOps(36)).toBe(8);
  });

  it("buy consumes cash, slot, and merges same symbol", () => {
    let s = createInitialGameState();
    s.company.cash = 10_000;
    s = buyPortfolio(s, {
      symbol: "VWCE.DE",
      label: "VWCE",
      amountEur: 1000,
      priceEur: 100,
      assetClass: "etf",
    });
    expect(s.portfolio).toHaveLength(1);
    expect(s.portfolio![0]!.shares).toBe(10);
    expect(s.company.cash).toBe(9000);
    expect(s.portfolioOpsUsedThisMonth).toBe(1);
    expect(portfolioOpsRemaining(s)).toBe(1);

    s = buyPortfolio(s, {
      symbol: "vwce.de",
      label: "VWCE",
      amountEur: 500,
      priceEur: 100,
    });
    expect(s.portfolio).toHaveLength(1);
    expect(s.portfolio![0]!.shares).toBe(15);
    expect(s.portfolioOpsUsedThisMonth).toBe(2);
    expect(portfolioOpsRemaining(s)).toBe(0);

    const blocked = buyPortfolio(s, {
      symbol: "AAPL",
      label: "Apple",
      amountEur: 500,
      priceEur: 150,
    });
    expect(blocked.portfolio).toHaveLength(1);
  });

  it("sell credits cash and records plusvalenza", () => {
    let s = createInitialGameState();
    s.company.cash = 5000;
    s = buyPortfolio(s, {
      symbol: "AAPL",
      label: "Apple",
      amountEur: 1000,
      priceEur: 100,
    });
    s.portfolioOpsUsedThisMonth = 0;
    s = sellPortfolio(s, "AAPL", 5, 120);
    expect(s.company.cash).toBe(4600);
    expect(s.ytd.capitalGains).toBe(100);
    expect(s.portfolio![0]!.shares).toBe(5);
  });

  it("drains liquid positions for enforcement", () => {
    const s = createInitialGameState();
    s.company.cash = 200;
    s.portfolio = [
      {
        symbol: "XEON.MI",
        label: "Liquid",
        shares: 10,
        avgCostEur: 100,
        assetClass: "etf",
        liquid: true,
        lastPriceEur: 100,
      },
      {
        symbol: "SWDA.MI",
        label: "World",
        shares: 5,
        avgCostEur: 100,
        assetClass: "etf",
        lastPriceEur: 100,
      },
    ];
    const taken = drainCashThenPortfolioLiquid(s, 500);
    expect(taken).toBe(500);
    expect(s.company.cash).toBe(0);
    expect(s.portfolio!.find((p) => p.symbol === "XEON.MI")!.shares).toBeCloseTo(7, 1);
    expect(s.portfolio!.find((p) => p.symbol === "SWDA.MI")!.shares).toBe(5);
  });

  it("covers negative cash from liquid holdings", () => {
    const s = createInitialGameState();
    s.company.cash = -300;
    s.portfolio = [
      {
        symbol: "XEON.MI",
        label: "Liquid",
        shares: 10,
        avgCostEur: 100,
        assetClass: "etf",
        liquid: true,
        lastPriceEur: 100,
      },
    ];
    const taken = coverNegativeCashFromPortfolio(s);
    expect(taken).toBe(300);
    expect(s.company.cash).toBe(0);
  });

  it("migratePortfolioLegacy converts treasury and growth", () => {
    let s = createInitialGameState();
    s.portfolioLegacyMigrated = false;
    s.treasury = 5000;
    s.growthInvested = 3500;
    s.growthCapacityBonus = 1;
    s.activeProject = { id: "formazione", monthsLeft: 3, frozenCash: 2000 };
    s = migratePortfolioLegacy(s);
    expect(s.treasury).toBe(0);
    expect(s.growthInvested).toBe(0);
    expect(s.growthCapacityBonus).toBe(1);
    expect(s.activeProject).toBeNull();
    expect(s.company.cash).toBeGreaterThanOrEqual(2000);
    expect(s.portfolio!.length).toBeGreaterThanOrEqual(2);
    expect(s.portfolioLegacyMigrated).toBe(true);
    expect(portfolioTotalValue(s)).toBeGreaterThan(8000);
  });
});
