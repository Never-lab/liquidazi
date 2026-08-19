import { describe, expect, it } from "vitest";
import { HOLDING_SLOT_BASE } from "../config/holding";
import {
  depositTreasury,
  GROWTH_PER_SLOT,
  investGrowth,
  withdrawTreasury,
} from "./actions";
import {
  applySubsidiaryMonth,
  buyAcquisition,
  generateAcquisitionBoard,
  refreshAcquisitionBoard,
} from "./acquisitions";
import { advanceMonth } from "./advanceMonth";
import { rng } from "./events";
import { availableWorkforce } from "./workforce";
import { createInitialGameState, round2 } from "./types";

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

  it("growth: GROWTH_PER_SLOT € → +8 FL", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.company.cash = 20000;
    const cap0 = availableWorkforce(s);
    s = investGrowth(s, GROWTH_PER_SLOT);
    expect(s.growthCapacityBonus).toBe(1);
    expect(availableWorkforce(s)).toBe(cap0 + 8);
  });

  it("buy acquisition: paga, max slots, drip in mese", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.quietMode = true;
    s.company.cash = 200000;
    s = refreshAcquisitionBoard(s);
    expect(s.acquisitionBoard.length).toBeGreaterThan(0);
    const target = s.acquisitionBoard[0]!;
    const cashBefore = s.company.cash;
    s = buyAcquisition(s, target.id);
    expect(s.subsidiaries).toHaveLength(1);
    expect(s.subsidiaries[0]!.purchasePrice).toBe(target.price);
    expect(s.company.cash).toBe(cashBefore - target.price);

    const ebitda = s.subsidiaries[0]!.monthlyEbitda;
    const risk = s.subsidiaries[0]!.risk;
    const cash2 = s.company.cash;
    applySubsidiaryMonth(s, rng(1));
    const drift = { low: 0.01, med: 0.005, high: -0.005 } as const;
    const expectedDrip = round2(ebitda * (1 + drift[risk]));
    expect(s.company.cash).toBe(cash2 + expectedDrip);

    // fill to max
    while (s.subsidiaries.length < HOLDING_SLOT_BASE) {
      s.company.cash = 500000;
      const { board, nextId } = generateAcquisitionBoard(s);
      s.acquisitionBoard = board;
      s.nextId = nextId;
      const t = s.acquisitionBoard[0]!;
      s = buyAcquisition(s, t.id);
    }
    expect(s.subsidiaries).toHaveLength(HOLDING_SLOT_BASE);
    s.company.cash = 500000;
    const { board, nextId } = generateAcquisitionBoard(s);
    s.acquisitionBoard = board;
    s.nextId = nextId;
    const blocked = buyAcquisition(s, s.acquisitionBoard[0]!.id);
    expect(blocked.subsidiaries).toHaveLength(HOLDING_SLOT_BASE);
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
        purchasePrice: 5000,
        listedUntilMonthIdx: null,
        capexCooldownMonths: 0,
      },
    ];
    const before = s.company.cash;
    // many rolls — quiet skips risk; EBITDA drifts each month (high: −0.5%)
    for (let i = 0; i < 20; i++) {
      applySubsidiaryMonth(s, rng(i + 99));
    }
    let cash = before;
    let ebitda = 500;
    for (let i = 0; i < 20; i++) {
      ebitda = round2(Math.max(100, ebitda * 0.995));
      cash = round2(cash + ebitda);
    }
    expect(s.company.cash).toBe(cash);
  });

  it("tesoreria matura interessi in advanceMonth", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 5000;
    s.treasury = 10000;
    s = advanceMonth(s);
    expect(s.treasury).toBeGreaterThan(10000);
  });

  it("interessi tesoreria accumulano in ytd", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 5000;
    s.treasury = 10000;
    s = advanceMonth(s);
    expect(s.ytd.treasuryInterest ?? 0).toBeGreaterThan(0);
  });

  it("bilancio di dicembre include interessi tesoreria nell'utile", () => {
    const seed = () => {
      const s = createInitialGameState();
      s.quietMode = true;
      s.company.cash = 100000;
      s.calendar = { month: 12, year: 2024 };
      s.ytd = {
        revenue: 5000,
        purchases: 0,
        payrollCost: 0,
        interest: 0,
        otherCosts: 0,
        capitalGains: 0,
      };
      return s;
    };
    let without = seed();
    without.treasury = 0;
    without = advanceMonth(without);
    let withT = seed();
    withT.treasury = 10000;
    withT = advanceMonth(withT);
    const earned = withT.lastYearReport?.treasuryInterest ?? 0;
    expect(earned).toBeGreaterThan(0);
    expect(withT.lastYearReport?.profit).toBeCloseTo(
      (without.lastYearReport?.profit ?? 0) + earned,
    );
  });
});
