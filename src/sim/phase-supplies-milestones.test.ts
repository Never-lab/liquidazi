import { describe, expect, it } from "vitest";
import { HOLDING_SLOT_BASE, HOLDING_SLOT_MAX } from "../config/holding";
import { advanceMonth } from "./advanceMonth";
import { acceptOpportunity } from "./events";
import { maxDealNet } from "./events";
import { unlockMilestones } from "./milestones";
import { createInitialGameState } from "./types";

describe("Supplies + milestones", () => {
  it("fornitura alza supplyMonths; senza scorte ticket più basso", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.supplyMonths = 0;
    const low = maxDealNet(s);
    s.supplyMonths = 3;
    const high = maxDealNet(s);
    expect(high).toBeGreaterThan(low);

    s.opportunities = [
      {
        id: 1,
        kind: "supply",
        title: "Fornitura test",
        net: 400,
        expiresInMonths: 1,
        termMonths: 1,
      },
    ];
    s.supplyMonths = 3;
    s = acceptOpportunity(s, 1);
    expect(s.supplyMonths).toBe(4);
  });

  it("milestones: survive_12 e first_acquisition", () => {
    let s = createInitialGameState();
    s.monthsPlayed = 12;
    let r = unlockMilestones(s);
    expect(r.unlocked).toContain("survive_12");

    s = r.state;
    s.subsidiaries = [
      {
        id: 1,
        name: "X",
        sector: "servizi",
        monthlyEbitda: 100,
        capacityBonus: 0,
        monthsOwned: 1,
        risk: "low",
        purchasePrice: 1000,
        listedUntilMonthIdx: null,
        capexCooldownMonths: 0,
      },
    ];
    r = unlockMilestones(s);
    expect(r.unlocked).toContain("first_acquisition");
  });

  it("milestones bump holdingSlotCap: first_acquisition → 5", () => {
    let s = createInitialGameState();
    expect(s.holdingSlotCap).toBe(HOLDING_SLOT_BASE);
    s.subsidiaries = [
      {
        id: 1,
        name: "X",
        sector: "servizi",
        monthlyEbitda: 100,
        capacityBonus: 0,
        monthsOwned: 1,
        risk: "low",
        purchasePrice: 1000,
        listedUntilMonthIdx: null,
        capexCooldownMonths: 0,
      },
    ];
    const r = unlockMilestones(s);
    expect(r.state.holdingSlotCap).toBe(5);
  });

  it("milestones bump holdingSlotCap through survive_12, year1_profit, compliance_80", () => {
    let s = createInitialGameState();
    s.compliance = 50;
    s.monthsPlayed = 12;
    let r = unlockMilestones(s);
    expect(r.state.holdingSlotCap).toBe(6);

    s = r.state;
    s.lastYearReport = {
      year: 2026,
      revenue: 100000,
      purchases: 0,
      payrollCost: 0,
      interest: 0,
      otherCosts: 0,
      capitalGains: 0,
      profit: 5000,
      irapBase: 5000,
      ires: 1200,
      irap: 390,
    };
    s.yearReports = [s.lastYearReport];
    r = unlockMilestones(s);
    expect(r.state.holdingSlotCap).toBe(7);

    s = r.state;
    s.compliance = 80;
    r = unlockMilestones(s);
    expect(r.state.holdingSlotCap).toBe(8);
    expect(r.state.holdingSlotCap).toBe(HOLDING_SLOT_MAX);
  });

  it("holdingSlotCap bumps are monotonic and clamped at HOLDING_SLOT_MAX", () => {
    let s = createInitialGameState();
    s.holdingSlotCap = 7;
    s.milestones = ["first_acquisition", "survive_12", "year1_profit", "compliance_80"];
    const r = unlockMilestones(s);
    expect(r.state.holdingSlotCap).toBe(HOLDING_SLOT_MAX);
  });

  it("advanceMonth copies holdingSlotCap when survive_12 unlocks", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.monthsPlayed = 11;
    s.compliance = 79; // below 80 — avoid compliance_80 firing same close (default is 100)
    s.holdingSlotCap = HOLDING_SLOT_BASE;
    s.milestones = [];

    s = advanceMonth(s);

    expect(s.monthsPlayed).toBe(12);
    expect(s.milestones).toContain("survive_12");
    expect(s.holdingSlotCap).toBeGreaterThanOrEqual(6);
  });

  it("rifiuta fornitura se supera il cap magazzino", () => {
    let s = createInitialGameState();
    s.supplyMonths = 6;
    s.opportunities = [
      {
        id: 1,
        kind: "supply",
        title: "Fornitura test",
        net: 400,
        expiresInMonths: 1,
        termMonths: 1,
      },
    ];
    s = acceptOpportunity(s, 1);
    expect(s.supplyMonths).toBe(6);
    expect(s.opportunities).toHaveLength(1);
    expect(s.lastUiHint?.text).toMatch(/Magazzino pieno/);
  });

  it("upgrade scorte lv4 alza il cap a 14 mesi", () => {
    let s = createInitialGameState();
    s.upgradeLevels = { scorte: 4 };
    s.supplyMonths = 12;
    s.opportunities = [
      {
        id: 1,
        kind: "supply",
        title: "Fornitura test",
        net: 1200,
        expiresInMonths: 1,
        termMonths: 1,
      },
    ];
    s = acceptOpportunity(s, 1);
    expect(s.supplyMonths).toBe(14);
    expect(s.lastUiHint).toBeNull();
  });
});
