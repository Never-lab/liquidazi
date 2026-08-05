import { describe, expect, it } from "vitest";
import {
  depositTreasury,
  GROWTH_PER_SLOT,
  investGrowth,
  MAX_SUBSIDIARIES,
  withdrawTreasury,
} from "./actions";
import {
  applySubsidiaryMonth,
  buyAcquisition,
  generateAcquisitionBoard,
  refreshAcquisitionBoard,
} from "./acquisitions";
import { advanceMonth } from "./advanceMonth";
import { monthlyCapacity, rng } from "./events";
import { createInitialGameState } from "./types";

describe("Investimenti + acquisizioni lite", () => {
  it("deposit + withdraw conservano cassa+tesoreria", () => {
    let s = createInitialGameState();
    s.company.cash = 10000;
    const total0 = s.company.cash + (s.treasury ?? 0);
    s = depositTreasury(s, 2000);
    expect(s.treasury).toBe(2000);
    expect(s.company.cash).toBe(8000);
    expect(s.company.cash + s.treasury).toBe(total0);
    s = withdrawTreasury(s, 500);
    expect(s.treasury).toBe(1500);
    expect(s.company.cash).toBe(8500);
    expect(s.company.cash + s.treasury).toBe(total0);
  });

  it("growth: 4000 € → +1 capacity", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.company.cash = 20000;
    const cap0 = monthlyCapacity(s);
    s = investGrowth(s, GROWTH_PER_SLOT);
    expect(s.growthCapacityBonus).toBe(1);
    expect(monthlyCapacity(s)).toBe(cap0 + 1);
  });

  it("buy acquisition: paga, max 3, drip in mese", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.quietMode = true;
    s.company.cash = 200000;
    s = refreshAcquisitionBoard(s);
    expect(s.acquisitionBoard.length).toBeGreaterThan(0);
    const target = s.acquisitionBoard[0]!;
    const cashBefore = s.company.cash;
    s = buyAcquisition(s, target.id);
    expect(s.subsidiaries).toHaveLength(1);
    expect(s.company.cash).toBe(cashBefore - target.price);

    const ebitda = s.subsidiaries[0]!.monthlyEbitda;
    const cash2 = s.company.cash;
    applySubsidiaryMonth(s, rng(1));
    expect(s.company.cash).toBe(cash2 + ebitda);

    // fill to max
    while (s.subsidiaries.length < MAX_SUBSIDIARIES) {
      s.company.cash = 500000;
      const { board, nextId } = generateAcquisitionBoard(s);
      s.acquisitionBoard = board;
      s.nextId = nextId;
      const t = s.acquisitionBoard[0]!;
      s = buyAcquisition(s, t.id);
    }
    expect(s.subsidiaries).toHaveLength(MAX_SUBSIDIARIES);
    s.company.cash = 500000;
    const { board, nextId } = generateAcquisitionBoard(s);
    s.acquisitionBoard = board;
    s.nextId = nextId;
    const blocked = buyAcquisition(s, s.acquisitionBoard[0]!.id);
    expect(blocked.subsidiaries).toHaveLength(MAX_SUBSIDIARIES);
  });

  it("quietMode: drip sì, niente hit integrazione", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 10000;
    s.subsidiaries = [
      {
        id: 1,
        name: "Test Co",
        sector: "servizi",
        monthlyEbitda: 500,
        capacityBonus: 0,
        monthsOwned: 0,
        risk: "high",
      },
    ];
    const before = s.company.cash;
    // many rolls — quiet skips risk
    for (let i = 0; i < 20; i++) {
      applySubsidiaryMonth(s, rng(i + 99));
    }
    // only drips: 20 * 500
    expect(s.company.cash).toBe(before + 20 * 500);
  });

  it("tesoreria matura interessi in advanceMonth", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 5000;
    s.treasury = 10000;
    s = advanceMonth(s);
    expect(s.treasury).toBeGreaterThan(10000);
  });
});
