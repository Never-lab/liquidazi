import { describe, expect, it } from "vitest";
import { fiscalYearSnapshot as snap } from "../config/fiscalYearSnapshot";
import { advanceMonth } from "./advanceMonth";
import { skipProjectOffer } from "./projects";
import { buyUpgrade, hireEmployee } from "./actions";
import {
  BOARD_MAX_OPS,
  generateOpportunities,
  maxDealNet,
  monthlyCapacity,
} from "./events";
import { createInitialGameState, round2 } from "./types";

describe("Staff board + upgrades lite", () => {
  it("capacity: primi 8 full at morale 100, poi 1/2; 100 dipendenti non = 100 slot", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.staffMorale = 100;
    const base = monthlyCapacity(s);
    for (let i = 0; i < 8; i++) s = hireEmployee(s, "Operaio");
    expect(monthlyCapacity(s)).toBe(base + 8);
    for (let i = 0; i < 6; i++) s = hireEmployee(s, "Operaio");
    // +6 extra pts → floor(6/2)=3, not +6
    expect(monthlyCapacity(s)).toBe(base + 8 + 3);
    for (let i = 0; i < 86; i++) s = hireEmployee(s, "Operaio");
    expect(monthlyCapacity(s)).toBeLessThan(60);
  });

  it("tabellone scala con staff; capped a BOARD_MAX_OPS", () => {
    const solo = createInitialGameState({ city: "058091", sector: "servizi" });
    const { ops: few } = generateOpportunities(solo, { forceRegime: "normale" });
    const salesFew = few.filter((o) => o.kind === "sale").length;

    let hired = solo;
    for (let i = 0; i < 4; i++) hired = hireEmployee(hired, "Operaio");
    const { ops: more } = generateOpportunities(
      { ...hired, nextId: 50, monthsPlayed: 2 },
      { forceRegime: "normale" },
    );
    const salesMore = more.filter((o) => o.kind === "sale").length;

    expect(salesMore).toBeGreaterThan(salesFew);
    expect(more.length).toBeLessThanOrEqual(BOARD_MAX_OPS);
  });

  it("yearReports accumula a dicembre", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 100000;
    s.calendar = { month: 12, year: 2024 };
    s.ytd = {
      revenue: 20000,
      purchases: 5000,
      payrollCost: 2000,
      interest: 0,
      otherCosts: 1000,
      capitalGains: 0,
    };
    s = advanceMonth(s);
    if (s.projectOffer) s = skipProjectOffer(s);
    expect(s.lastYearReport?.year).toBe(2024);
    expect(s.yearReports).toHaveLength(1);
    expect(s.yearReports[0]?.revenue).toBe(20000);

    s.calendar = { month: 12, year: 2025 };
    s.ytd = {
      revenue: 30000,
      purchases: 8000,
      payrollCost: 4000,
      interest: 100,
      otherCosts: 1200,
      capitalGains: 0,
    };
    s.projectOffer = null;
    s = advanceMonth(s);
    expect(s.yearReports).toHaveLength(2);
    expect(s.yearReports[1]?.year).toBe(2025);
  });

  it("gestionale F24 auto-paga se cassa basta", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 20000;
    s = buyUpgrade(s, "gestionale_f24");
    expect(s.upgradeLevels?.gestionale_f24).toBe(1);
    const idx = 2024 * 12; // gen 2024
    s.liabilities.push({
      id: 99,
      kind: "IVA",
      amount: 500,
      dueIdx: idx,
      paid: false,
      penalized: false,
    });
    const cashBefore = s.company.cash;
    s = advanceMonth(s);
    expect(s.liabilities.find((l) => l.id === 99)?.paid).toBe(true);
    expect(s.company.cash).toBe(cashBefore - 500);
    expect(s.log.some((e) => e.text.includes("Gestionale"))).toBe(true);
  });

  it("gestionale F24 Lv2 +1 compliance on auto-pay; Lv3 +2 total", () => {
    const idx = 2024 * 12;
    const withDueF24 = () => {
      const s = createInitialGameState();
      s.quietMode = true;
      s.company.cash = 20000;
      s.compliance = 50;
      s.liabilities.push({
        id: 99,
        kind: "IVA",
        amount: 500,
        dueIdx: idx,
        paid: false,
        penalized: false,
      });
      return s;
    };

    let s = withDueF24();
    s.upgradeLevels = { gestionale_f24: 2 };
    s = advanceMonth(s);
    expect(s.compliance).toBe(51);

    s = withDueF24();
    s.upgradeLevels = { gestionale_f24: 3 };
    s = advanceMonth(s);
    expect(s.compliance).toBe(52);
  });

  it("sede riduce affitto; processi alza capacity", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.company.cash = 50000;
    const rent0 = s.company.monthlyRent;
    expect(rent0).toBeGreaterThan(0);
    const cap0 = monthlyCapacity(s);
    s = buyUpgrade(s, "sede");
    expect(s.company.monthlyRent).toBeCloseTo(rent0 * 0.85);
    s = buyUpgrade(s, "processi");
    expect(monthlyCapacity(s)).toBe(cap0 + 1);
  });

  it("processi levels stack capacity 1 then 2 then 3", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.company.cash = 100000;
    const cap0 = monthlyCapacity(s);
    s = buyUpgrade(s, "processi");
    expect(monthlyCapacity(s)).toBe(cap0 + 1);
    s = buyUpgrade(s, "processi");
    expect(monthlyCapacity(s)).toBe(cap0 + 2);
    s = buyUpgrade(s, "processi");
    expect(monthlyCapacity(s)).toBe(cap0 + 3);
    const frozen = buyUpgrade(s, "processi");
    expect(frozen.upgradeLevels?.processi).toBe(3);
    expect(frozen.company.cash).toBe(s.company.cash);
  });

  it("buyUpgrade no-op persists legacy upgradeLevels migrate", () => {
    const s = createInitialGameState();
    s.upgrades = ["processi"];
    s.upgradeLevels = undefined;
    s.company.cash = 0;
    const result = buyUpgrade(s, "processi");
    expect(result.upgradeLevels?.processi).toBe(1);
    expect(result.company.cash).toBe(0);
  });

  it("sede levels apply factor vs rent base not compound", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    s.company.cash = 100000;
    const base = s.company.monthlyRent;
    s = buyUpgrade(s, "sede");
    expect(s.company.monthlyRent).toBeCloseTo(base * 0.85);
    s = buyUpgrade(s, "sede");
    expect(s.company.monthlyRent).toBeCloseTo(base * 0.78);
  });

  it("legacy sede Lv1 reconstructs rent base before Lv2", () => {
    let s = createInitialGameState({ city: "058091", sector: "servizi" });
    const original = s.company.monthlyRent;
    s.upgrades = ["sede"];
    s.upgradeLevels = undefined;
    s.company.monthlyRent = round2(original * 0.85);
    delete s.company.monthlyRentBase;
    s.company.cash = 100000;

    s = buyUpgrade(s, "sede");
    expect(s.company.monthlyRent).toBeCloseTo(original * 0.78);
    expect(s.company.monthlyRent).not.toBeCloseTo(original * 0.85 * 0.78);
  });

  it("legacy sede Lv1 no-op when insufficient cash for Lv2", () => {
    const s = createInitialGameState({ city: "058091", sector: "servizi" });
    const original = s.company.monthlyRent;
    s.upgrades = ["sede"];
    s.upgradeLevels = undefined;
    s.company.monthlyRent = round2(original * 0.85);
    delete s.company.monthlyRentBase;
    s.company.cash = 0;

    const result = buyUpgrade(s, "sede");
    expect(result.company.monthlyRent).toBeCloseTo(original * 0.85);
  });

  it("commerciale ticket ceiling scales with level", () => {
    const base = createInitialGameState({ city: "058091", sector: "servizi" });
    base.quietMode = true;
    const cap0 = maxDealNet(base);

    const lv2 = { ...base, upgradeLevels: { commerciale: 2 as const } };
    const cap2 = maxDealNet(lv2);
    expect(cap2).toBeGreaterThan(cap0);
    expect(cap2 / cap0).toBeCloseTo(1.12, 2);
  });

  it("processi Lv1 payroll discount via advanceMonth", () => {
    let s = createInitialGameState();
    s.quietMode = true;
    s.company.cash = 50000;
    s = hireEmployee(s, "Operaio");
    s = buyUpgrade(s, "processi");

    const gross = s.employees[0]!.grossMonthly;
    const inpsEmployee = round2(gross * snap.inps_employee_rate);
    const irpef = round2(gross * snap.irpef_withholding_simplified_rate);
    const net = round2(gross - inpsEmployee - irpef);

    s = advanceMonth(s);
    expect(s.lastPayroll?.totalNet).toBeCloseTo(net * 0.95);
  });
});
