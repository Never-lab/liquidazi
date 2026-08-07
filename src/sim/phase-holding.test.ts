import { describe, expect, it } from "vitest";
import { HOLDING_SLOT_BASE } from "../config/holding";
import {
  buyAcquisition,
  estimateSubsidiaryValue,
  generateAcquisitionBoard,
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
