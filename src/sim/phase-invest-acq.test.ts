import { describe, expect, it } from "vitest";
import { HOLDING_SLOT_BASE } from "../config/holding";
import {
  applySubsidiaryMonth,
  buyAcquisition,
  generateAcquisitionBoard,
  refreshAcquisitionBoard,
} from "./acquisitions";
import { advanceMonth } from "./advanceMonth";
import { buyPortfolio, sellPortfolio } from "./portfolio";
import { rng } from "./events";
import { createInitialGameState, round2 } from "./types";

describe("Portafoglio + acquisizioni lite", () => {
  it("buy + sell conservano cassa+portafoglio (minus P/L)", () => {
    let s = createInitialGameState();
    s.company.cash = 10_000;
    s = buyPortfolio(s, {
      symbol: "VWCE.DE",
      label: "VWCE",
      amountEur: 2000,
      priceEur: 100,
      assetClass: "etf",
    });
    expect(s.portfolio).toHaveLength(1);
    expect(s.company.cash).toBe(8000);
    s.portfolioOpsUsedThisMonth = 0;
    s = sellPortfolio(s, "VWCE.DE", 20, 100);
    expect(s.company.cash).toBe(10_000);
    expect(s.portfolio).toHaveLength(0);
  });

  it("plusvalenza su vendita in utile", () => {
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
    expect(s.ytd.capitalGains).toBe(100);
  });

  it("buy acquisition: paga, max slots, drip in mese", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.quietMode = true;
    s.company.cash = 200_000;
    s = refreshAcquisitionBoard(s);
    expect(s.acquisitionBoard.length).toBeGreaterThan(0);
    const target = s.acquisitionBoard[0]!;
    const cashBefore = s.company.cash;
    s = buyAcquisition(s, target.id);
    expect(s.subsidiaries).toHaveLength(1);
    expect(s.company.cash).toBe(cashBefore - target.price);

    const ebitda = s.subsidiaries[0]!.monthlyEbitda;
    const risk = s.subsidiaries[0]!.risk;
    const cash2 = s.company.cash;
    applySubsidiaryMonth(s, rng(1));
    const drift = { low: 0.01, med: 0.005, high: -0.005 } as const;
    const expectedDrip = round2(ebitda * (1 + drift[risk]));
    expect(s.company.cash).toBe(cash2 + expectedDrip);

    while (s.subsidiaries.length < HOLDING_SLOT_BASE) {
      s.company.cash = 500_000;
      const { board, nextId } = generateAcquisitionBoard(s);
      s.acquisitionBoard = board;
      s.nextId = nextId;
      const t = s.acquisitionBoard[0]!;
      s = buyAcquisition(s, t.id);
    }
    expect(s.subsidiaries).toHaveLength(HOLDING_SLOT_BASE);
  });

  it("portfolioHistory grows after month with holdings", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 5000;
    s = buyPortfolio(s, {
      symbol: "SWDA.MI",
      label: "World",
      amountEur: 1000,
      priceEur: 50,
    });
    s = advanceMonth(s);
    expect((s.portfolioHistory ?? []).length).toBeGreaterThan(0);
    expect(s.portfolioOpsUsedThisMonth).toBe(0);
  });
});
