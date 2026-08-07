import { describe, expect, it } from "vitest";
import { HOLDING_SLOT_BASE } from "../config/holding";
import {
  applySubsidiaryMonth,
  buyAcquisition,
  estimateSubsidiaryValue,
  generateAcquisitionBoard,
  investSubsidiaryCapex,
  refreshAcquisitionBoard,
} from "./acquisitions";
import { createInitialGameState } from "./types";

describe("holding buy + value", () => {
  it("estimate scales with EBITDA and risk", () => {
    const base = estimateSubsidiaryValue({
      monthlyEbitda: 1000,
      risk: "med",
      monthsOwned: 0,
    });
    expect(base).toBe(11000);
    const high = estimateSubsidiaryValue({
      monthlyEbitda: 1000,
      risk: "high",
      monthsOwned: 0,
    });
    expect(high).toBe(9900);
  });

  it("buy stores purchasePrice and respects holdingSlotCap", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.quietMode = true;
    s.company.cash = 5_000_000;
    s.holdingSlotCap = HOLDING_SLOT_BASE;
    s = refreshAcquisitionBoard(s);
    const t = s.acquisitionBoard[0]!;
    s = buyAcquisition(s, t.id);
    expect(s.subsidiaries[0]!.purchasePrice).toBe(t.price);
    while (s.subsidiaries.length < s.holdingSlotCap) {
      s.company.cash = 5_000_000;
      const g = generateAcquisitionBoard(s);
      s.acquisitionBoard = g.board;
      s.nextId = g.nextId;
      s = buyAcquisition(s, s.acquisitionBoard[0]!.id);
    }
    expect(s.subsidiaries).toHaveLength(HOLDING_SLOT_BASE);
    s.company.cash = 5_000_000;
    const g2 = generateAcquisitionBoard(s);
    s.acquisitionBoard = g2.board;
    s.nextId = g2.nextId;
    const blocked = buyAcquisition(s, s.acquisitionBoard[0]!.id);
    expect(blocked.subsidiaries).toHaveLength(HOLDING_SLOT_BASE);
  });
});

describe("holding CAPEX + drift", () => {
  it("CAPEX raises EBITDA, costs cash, sets cooldown", () => {
    let s = createInitialGameState();
    s.company.cash = 100000;
    s.ytd.capitalGains = 0;
    s.subsidiaries = [
      {
        id: 1,
        name: "Co",
        sector: "servizi",
        monthlyEbitda: 1000,
        capacityBonus: 0,
        monthsOwned: 1,
        risk: "med",
        purchasePrice: 20000,
        listedUntilMonthIdx: null,
        capexCooldownMonths: 0,
      },
    ];
    const before = s.company.cash;
    s = investSubsidiaryCapex(s, 1);
    expect(s.subsidiaries[0]!.monthlyEbitda).toBe(1160);
    expect(s.company.cash).toBe(before - 6000);
    expect(s.ytd.otherCosts).toBe(6000);
    expect(s.subsidiaries[0]!.capexCooldownMonths).toBe(6);
    const blocked = investSubsidiaryCapex(s, 1);
    expect(blocked.company.cash).toBe(s.company.cash);
  });

  it("drift changes EBITDA each month", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.subsidiaries = [
      {
        id: 1,
        name: "Co",
        sector: "servizi",
        monthlyEbitda: 1000,
        capacityBonus: 0,
        monthsOwned: 0,
        risk: "low",
        purchasePrice: 10000,
        listedUntilMonthIdx: null,
        capexCooldownMonths: 2,
      },
    ];
    const initialCash = s.company.cash;
    applySubsidiaryMonth(s, () => 0.99);
    expect(s.subsidiaries[0]!.monthlyEbitda).toBe(1010);
    expect(s.subsidiaries[0]!.capexCooldownMonths).toBe(1);
    expect(s.company.cash).toBe(initialCash + 1010);
  });
});
